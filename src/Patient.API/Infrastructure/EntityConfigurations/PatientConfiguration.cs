using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Patient.API.Infrastructure.EntityConfigurations;

public class PatientConfiguration : IEntityTypeConfiguration<Models.Patient>
{
    public void Configure(EntityTypeBuilder<Models.Patient> builder)
    {
        builder.ToTable("Patients");

        builder.HasKey(patient => patient.Id);

        builder.Property(patient => patient.Id)
            .ValueGeneratedNever();

        // Medical Record Number — unique identifier for the patient
        builder.Property(patient => patient.MedicalRecordNumber)
            .HasMaxLength(50)
            .IsRequired();

        builder.HasIndex(patient => patient.MedicalRecordNumber)
            .IsUnique();

        // Personal Information
        builder.Property(patient => patient.FirstName)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(patient => patient.LastName)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(patient => patient.DateOfBirth)
            .IsRequired();

        builder.Property(patient => patient.Gender)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(patient => patient.SocialSecurityNumber)
            .HasMaxLength(11);

        // Contact Information
        builder.Property(patient => patient.Email)
            .HasMaxLength(256)
            .IsRequired();

        builder.HasIndex(patient => patient.Email)
            .IsUnique();

        builder.Property(patient => patient.PhoneNumber)
            .HasMaxLength(20)
            .IsRequired();

        // Medical Information
        builder.Property(patient => patient.BloodType)
            .HasMaxLength(10);

        builder.Property(patient => patient.Allergies)
            .HasMaxLength(2000);

        builder.Property(patient => patient.MedicalNotes)
            .HasMaxLength(4000);

        // Owned entities — stored in the same table as Patient
        builder.OwnsOne(patient => patient.Address, addressBuilder =>
        {
            addressBuilder.Property(address => address.Street)
                .HasMaxLength(200)
                .HasColumnName("Address_Street")
                .IsRequired();

            addressBuilder.Property(address => address.Street2)
                .HasMaxLength(200)
                .HasColumnName("Address_Street2");

            addressBuilder.Property(address => address.City)
                .HasMaxLength(100)
                .HasColumnName("Address_City")
                .IsRequired();

            addressBuilder.Property(address => address.State)
                .HasMaxLength(50)
                .HasColumnName("Address_State")
                .IsRequired();

            addressBuilder.Property(address => address.ZipCode)
                .HasMaxLength(20)
                .HasColumnName("Address_ZipCode")
                .IsRequired();

            addressBuilder.Property(address => address.Country)
                .HasMaxLength(100)
                .HasColumnName("Address_Country")
                .IsRequired();
        });

        builder.Navigation(patient => patient.Address).IsRequired();

        builder.OwnsOne(patient => patient.EmergencyContact, emergencyContactBuilder =>
        {
            emergencyContactBuilder.Property(emergencyContact => emergencyContact.Name)
                .HasMaxLength(200)
                .HasColumnName("EmergencyContact_Name")
                .IsRequired();

            emergencyContactBuilder.Property(emergencyContact => emergencyContact.Relationship)
                .HasMaxLength(50)
                .HasColumnName("EmergencyContact_Relationship")
                .IsRequired();

            emergencyContactBuilder.Property(emergencyContact => emergencyContact.PhoneNumber)
                .HasMaxLength(20)
                .HasColumnName("EmergencyContact_Phone")
                .IsRequired();

            emergencyContactBuilder.Property(emergencyContact => emergencyContact.Email)
                .HasMaxLength(256)
                .HasColumnName("EmergencyContact_Email");
        });

        builder.OwnsOne(patient => patient.Insurance, insuranceBuilder =>
        {
            insuranceBuilder.Property(insurance => insurance.Provider)
                .HasMaxLength(200)
                .HasColumnName("Insurance_Provider")
                .IsRequired();

            insuranceBuilder.Property(insurance => insurance.PolicyNumber)
                .HasMaxLength(100)
                .HasColumnName("Insurance_PolicyNumber")
                .IsRequired();

            insuranceBuilder.Property(insurance => insurance.GroupNumber)
                .HasMaxLength(100)
                .HasColumnName("Insurance_GroupNumber")
                .IsRequired();

            insuranceBuilder.Property(insurance => insurance.PlanName)
                .HasMaxLength(200)
                .HasColumnName("Insurance_PlanName");

            insuranceBuilder.Property(insurance => insurance.EffectiveDate)
                .HasColumnName("Insurance_EffectiveDate");

            insuranceBuilder.Property(insurance => insurance.ExpirationDate)
                .HasColumnName("Insurance_ExpirationDate");
        });

        // Audit
        builder.Property(patient => patient.CreatedAt)
            .IsRequired();

        builder.Property(patient => patient.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        // Indexes
        builder.HasIndex(patient => patient.LastName);
        builder.HasIndex(patient => patient.DateOfBirth);
        builder.HasIndex(patient => patient.IsActive);
    }
}
