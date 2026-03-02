using FluentValidation;
using MediTrack.ServiceDefaults;
using MediTrack.Shared.Common;
using MediTrack.Shared.Services;
using Microsoft.AspNetCore.Mvc;
using Patient.API.Dtos;
using Patient.API.Services;
using System.Security.Claims;

namespace Patient.API.Apis;

public static class PatientsApi
{
    public static IEndpointRouteBuilder MapPatientsApi(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/patients")
            .WithTags("Patients")
            .RequireAuthorization();

        group.MapGet("/", GetAllPatients)
            .WithName("GetAllPatients")
            .WithSummary("Get all patients (paginated)")
            .Produces<PagedResult<PatientListItemResponse>>();

        group.MapGet("/{id:guid}", GetPatientById)
            .WithName("GetPatientById")
            .WithSummary("Get a patient by ID")
            .Produces<PatientResponse>()
            .Produces(StatusCodes.Status404NotFound);

        group.MapGet("/by-user/{userId:guid}", GetPatientByUserId)
            .WithName("GetPatientByUserId")
            .WithSummary("Get a patient by Identity user ID (for cross-service IDOR checks)")
            .Produces<PatientIdResponse>()
            .Produces(StatusCodes.Status404NotFound);

        group.MapGet("/search", SearchPatients)
            .WithName("SearchPatients")
            .WithSummary("Search patients by name, email, or phone")
            .Produces<IReadOnlyList<PatientListItemResponse>>();

        group.MapPost("/", CreatePatient)
            .WithName("CreatePatient")
            .WithSummary("Create a new patient")
            .Produces<PatientResponse>(StatusCodes.Status201Created)
            .Produces<ValidationProblemDetails>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status409Conflict);

        group.MapPut("/{id:guid}", UpdatePatient)
            .WithName("UpdatePatient")
            .WithSummary("Update an existing patient")
            .Produces<PatientResponse>()
            .Produces<ValidationProblemDetails>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status409Conflict);

        group.MapPost("/{id:guid}/deactivate", DeactivatePatient)
            .WithName("DeactivatePatient")
            .WithSummary("Deactivate a patient (soft delete)")
            .RequireAuthorization(AuthorizationPolicies.RequireAdminOrReceptionist)
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status404NotFound);

        group.MapPost("/{id:guid}/activate", ActivatePatient)
            .WithName("ActivatePatient")
            .WithSummary("Reactivate a deactivated patient")
            .RequireAuthorization(AuthorizationPolicies.RequireAdminOrReceptionist)
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status404NotFound);

        return endpoints;
    }

    private static async Task<IResult> GetAllPatients(
        [FromQuery] bool includeInactive,
        [FromQuery] int pageNumber,
        [FromQuery] int pageSize,
        ClaimsPrincipal user,
        IPatientService patientService,
        CancellationToken cancellationToken)
    {
        // IDOR protection: Only staff can enumerate all patients (A01)
        if (!UserRoles.Staff.Any(role => user.IsInRole(role)))
        {
            return Results.Forbid();
        }

        var adjustedPageNumber = pageNumber < 1 ? 1 : pageNumber;
        var adjustedPageSize = pageSize < 1 ? 25 : pageSize;

        var result = await patientService.GetAllPagedAsync(includeInactive, adjustedPageNumber, adjustedPageSize, cancellationToken);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetPatientById(
        Guid id,
        ClaimsPrincipal user,
        IPatientService patientService,
        IPHIAuditService auditService,
        ILogger<Program> logger,
        CancellationToken cancellationToken)
    {
        var patient = await patientService.GetByIdAsync(id, cancellationToken);

        if (patient is null)
        {
            // 404 is not a security event — don't log failed PHI access for missing resources
            return Results.NotFound(new { message = $"Patient with ID {id} not found" });
        }

        // IDOR protection: Check if user can access this patient
        if (!await CanAccessPatientAsync(user, id, patientService, cancellationToken))
        {
            return Results.Forbid();
        }

        // Log successful PHI access (fire-and-forget — don't break happy path if audit fails)
        // Use CancellationToken.None: audit must complete even if the client disconnects
        _ = SafePublishAuditAsync(
            () => auditService.PublishAccessAsync(
                resourceType: AuditResourceTypes.Patient,
                resourceId: id.ToString(),
                patientId: id,
                action: AuditActions.Read,
                accessedFields: PatientAuditFields.AllFields,
                success: true,
                cancellationToken: CancellationToken.None),
            logger,
            "GetPatientById");

        return Results.Ok(patient);
    }

    private static async Task<IResult> GetPatientByUserId(
        Guid userId,
        ClaimsPrincipal user,
        IPatientService patientService,
        CancellationToken cancellationToken)
    {
        // Security check: only medical staff or the user themselves can look up by user ID
       var currentUserIdClaim = user.FindFirstValue(JwtClaims.Subject);
        if (string.IsNullOrEmpty(currentUserIdClaim) || !Guid.TryParse(currentUserIdClaim, out var currentUserId))
        {
            return Results.Unauthorized();
        }

        bool isStaff = UserRoles.Staff.Any(role => user.IsInRole(role));
        bool isOwnData = currentUserId == userId;

        if (!isStaff && !isOwnData)
        {
            return Results.Forbid();
        }

        var patientId = await patientService.GetPatientIdByUserIdAsync(userId, cancellationToken);

        if (patientId is null)
        {
            return Results.NotFound(new { message = $"No patient record found for user ID {userId}" });
        }

        return Results.Ok(new PatientIdResponse(patientId.Value));
    }

    private static async Task<IResult> SearchPatients(
        [FromQuery] string searchTerm,
        ClaimsPrincipal user,
        IPatientService patientService,
        IPHIAuditService auditService,
        ILogger<Program> logger,
        CancellationToken cancellationToken)
    {
        // IDOR protection: Only staff can search patients (A01)
        if (!UserRoles.Staff.Any(role => user.IsInRole(role)))
        {
            return Results.Forbid();
        }

        var patients = await patientService.SearchAsync(searchTerm, cancellationToken);

        // Log PHI search operation (fire-and-forget)
        _ = SafePublishAuditAsync(
            () => auditService.PublishAccessAsync(
                resourceType: AuditResourceTypes.Patient,
                resourceId: "search",
                patientId: Guid.Empty, // Search doesn't target a specific patient
                action: AuditActions.Search,
                accessedFields: PatientAuditFields.AllFields,
                success: true,
                additionalContext: new { SearchTerm = searchTerm, ResultCount = patients.Count },
                cancellationToken: CancellationToken.None),
            logger,
            "SearchPatients");

        return Results.Ok(patients);
    }

    private static async Task<IResult> CreatePatient(
        ClaimsPrincipal user,
        CreatePatientRequest request,
        IValidator<CreatePatientRequest> validator,
        IPatientService patientService,
        IPHIAuditService auditService,
        ILogger<Program> logger,
        CancellationToken cancellationToken)
    {
        // Extract current user ID from claims
        var userIdClaim = user.FindFirstValue(JwtClaims.Subject);
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Results.Unauthorized();
        }

        // Validate request
        var validationResult = await validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return Results.ValidationProblem(validationResult.ToDictionary());
        }

        // Check for duplicate email
        if (await patientService.EmailExistsAsync(request.Email, cancellationToken: cancellationToken))
        {
            return Results.Conflict(new { message = $"A patient with email {request.Email} already exists" });
        }

        var patient = await patientService.CreateAsync(userId, request, cancellationToken);

        // Log PHI creation (fire-and-forget)
        _ = SafePublishAuditAsync(
            () => auditService.PublishModificationAsync(
                resourceType: AuditResourceTypes.Patient,
                resourceId: patient.Id.ToString(),
                patientId: patient.Id,
                action: AuditActions.Create,
                modifiedFields: PatientAuditFields.AllFields,
                success: true,
                additionalContext: new { Operation = "PatientRegistration" },
                cancellationToken: CancellationToken.None),
            logger,
            "CreatePatient");

        return Results.CreatedAtRoute("GetPatientById", new { id = patient.Id }, patient);
    }

    private static async Task<IResult> UpdatePatient(
        Guid id,
        ClaimsPrincipal user,
        UpdatePatientRequest request,
        IValidator<UpdatePatientRequest> validator,
        IPatientService patientService,
        IPHIAuditService auditService,
        ILogger<Program> logger,
        CancellationToken cancellationToken)
    {
        // IDOR protection: Check if user can access this patient
        if (!await CanAccessPatientAsync(user, id, patientService, cancellationToken))
        {
            return Results.Forbid();
        }

        // Validate request
        var validationResult = await validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return Results.ValidationProblem(validationResult.ToDictionary());
        }

        // Check if patient exists
        if (!await patientService.ExistsAsync(id, cancellationToken))
        {
            // 404 is not a security event — missing resource, not failed PHI access
            return Results.NotFound(new { message = $"Patient with ID {id} not found" });
        }

        // Check for duplicate email (excluding current patient)
        if (await patientService.EmailExistsAsync(request.Email, id, cancellationToken))
        {
            return Results.Conflict(new { message = $"A patient with email {request.Email} already exists" });
        }

        var patient = await patientService.UpdateAsync(id, request, cancellationToken);

        // Log PHI modification (fire-and-forget)
        _ = SafePublishAuditAsync(
            () => auditService.PublishModificationAsync(
                resourceType: AuditResourceTypes.Patient,
                resourceId: id.ToString(),
                patientId: id,
                action: AuditActions.Update,
                modifiedFields: $"{PatientAuditFields.FirstName},{PatientAuditFields.LastName},{PatientAuditFields.Email},{PatientAuditFields.PhoneNumber},{PatientAuditFields.Address},{PatientAuditFields.EmergencyContact}",
                success: true,
                additionalContext: new { Operation = "ProfileUpdate" },
                cancellationToken: CancellationToken.None),
            logger,
            "UpdatePatient");

        return Results.Ok(patient);
    }

    private static async Task<IResult> DeactivatePatient(
        Guid id,
        ClaimsPrincipal user,
        IPatientService patientService,
        IPHIAuditService auditService,
        ILogger<Program> logger,
        CancellationToken cancellationToken)
    {
        // IDOR protection: Admin/Receptionist role already enforced by RequireAuthorization policy on endpoint
        // No additional check needed here since only staff can deactivate
        
        var success = await patientService.DeactivateAsync(id, cancellationToken);

        if (!success)
        {
            // 404 is not a security event
            return Results.NotFound(new { message = $"Patient with ID {id} not found" });
        }

        // Log PHI deactivation (soft delete) — fire-and-forget
        _ = SafePublishAuditAsync(
            () => auditService.PublishDeletionAsync(
                resourceType: AuditResourceTypes.Patient,
                resourceId: id.ToString(),
                patientId: id,
                deletionReason: "Patient deactivation requested",
                isSoftDelete: true,
                success: true,
                additionalContext: new { Operation = "PatientDeactivation" },
                cancellationToken: CancellationToken.None),
            logger,
            "DeactivatePatient");

        return Results.NoContent();
    }

    private static async Task<IResult> ActivatePatient(
        Guid id,
        IPatientService patientService,
        CancellationToken cancellationToken)
    {
        // Admin/Receptionist role already enforced by RequireAuthorization policy on endpoint
        var success = await patientService.ActivateAsync(id, cancellationToken);

        return success
            ? Results.NoContent()
            : Results.NotFound(new { message = $"Patient with ID {id} not found" });
    }

    /// <summary>
    /// Safely publish an audit event without crashing the happy path.
    /// Audit logging is critical for compliance, but should never break business operations.
    /// </summary>
    private static async Task SafePublishAuditAsync(
        Func<Task> auditAction,
        ILogger logger,
        string operationName)
    {
        try
        {
            await auditAction();
        }
        catch (Exception ex)
        {
            // Log the audit failure but don't throw — the business operation already succeeded
            logger.LogError(ex, "Failed to publish audit event for {Operation}. Audit logging failed but operation completed successfully.", operationName);
            // TODO: Consider storing failed audit events in a dead-letter queue for retry
        }
    }

    /// <summary>
    /// IDOR protection: Checks if the current user can access the specified patient record.
    /// - Patients can only access their own records (UserId matches)
    /// - Staff (Admin, Doctor, Nurse, Receptionist) can access all patient records
    /// </summary>
    private static async Task<bool> CanAccessPatientAsync(
        ClaimsPrincipal user,
        Guid patientId,
        IPatientService patientService,
        CancellationToken cancellationToken)
    {
        // Staff (including Receptionists for scheduling) can access all patients
        if (UserRoles.Staff.Any(role => user.IsInRole(role)))
        {
            return true;
        }

        // Extract current user ID from claims
        var userIdClaim = user.FindFirstValue(JwtClaims.Subject);
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return false;
        }

        // Check if the patient record belongs to the current user
        return await patientService.IsOwnedByUserAsync(patientId, userId, cancellationToken);
    }
}
