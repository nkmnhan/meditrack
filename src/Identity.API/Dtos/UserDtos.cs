namespace MediTrack.Identity.Dtos;

public sealed record UserListItemResponse
{
    public required string Id { get; init; }
    public required string FirstName { get; init; }
    public required string LastName { get; init; }
    public required string Email { get; init; }
    public required string Role { get; init; }
    public required bool IsActive { get; init; }
    public DateTimeOffset? LastLoginAt { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}

public sealed record UserSearchQuery(
    string? Role = null,
    string? Status = null,
    string? Search = null,
    int PageNumber = 1,
    int PageSize = 25);

public sealed record ChangeUserRoleRequest(string NewRole);
