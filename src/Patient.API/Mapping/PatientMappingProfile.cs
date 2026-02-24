using AutoMapper;
using Patient.API.Dtos;
using Patient.API.Models;

namespace Patient.API.Mapping;

public class PatientMappingProfile : Profile
{
    public PatientMappingProfile()
    {
        // Patient -> PatientResponse
        CreateMap<Models.Patient, PatientResponse>()
            .ForCtorParam("Id", options => options.MapFrom(source => source.Id))
            .ForCtorParam("MedicalRecordNumber", options => options.MapFrom(source => source.MedicalRecordNumber))
            .ForCtorParam("FirstName", options => options.MapFrom(source => source.FirstName))
            .ForCtorParam("LastName", options => options.MapFrom(source => source.LastName))
            .ForCtorParam("FullName", options => options.MapFrom(source => source.FullName))
            .ForCtorParam("DateOfBirth", options => options.MapFrom(source => source.DateOfBirth))
            .ForCtorParam("Age", options => options.MapFrom(source => source.Age))
            .ForCtorParam("Gender", options => options.MapFrom(source => source.Gender))
            .ForCtorParam("Email", options => options.MapFrom(source => source.Email))
            .ForCtorParam("PhoneNumber", options => options.MapFrom(source => source.PhoneNumber))
            .ForCtorParam("Address", options => options.MapFrom(source => source.Address))
            .ForCtorParam("BloodType", options => options.MapFrom(source => source.BloodType))
            .ForCtorParam("Allergies", options => options.MapFrom(source => source.Allergies))
            .ForCtorParam("MedicalNotes", options => options.MapFrom(source => source.MedicalNotes))
            .ForCtorParam("EmergencyContact", options => options.MapFrom(source => source.EmergencyContact))
            .ForCtorParam("Insurance", options => options.MapFrom(source => source.Insurance))
            .ForCtorParam("CreatedAt", options => options.MapFrom(source => source.CreatedAt))
            .ForCtorParam("UpdatedAt", options => options.MapFrom(source => source.UpdatedAt))
            .ForCtorParam("IsActive", options => options.MapFrom(source => source.IsActive));

        // Patient -> PatientListItemResponse
        CreateMap<Models.Patient, PatientListItemResponse>()
            .ForCtorParam("Id", options => options.MapFrom(source => source.Id))
            .ForCtorParam("MedicalRecordNumber", options => options.MapFrom(source => source.MedicalRecordNumber))
            .ForCtorParam("FullName", options => options.MapFrom(source => source.FullName))
            .ForCtorParam("DateOfBirth", options => options.MapFrom(source => source.DateOfBirth))
            .ForCtorParam("Age", options => options.MapFrom(source => source.Age))
            .ForCtorParam("Gender", options => options.MapFrom(source => source.Gender))
            .ForCtorParam("Email", options => options.MapFrom(source => source.Email))
            .ForCtorParam("PhoneNumber", options => options.MapFrom(source => source.PhoneNumber))
            .ForCtorParam("IsActive", options => options.MapFrom(source => source.IsActive));

        // Address -> AddressDto
        CreateMap<Address, AddressDto>()
            .ForCtorParam("Street", options => options.MapFrom(source => source.Street))
            .ForCtorParam("Street2", options => options.MapFrom(source => source.Street2))
            .ForCtorParam("City", options => options.MapFrom(source => source.City))
            .ForCtorParam("State", options => options.MapFrom(source => source.State))
            .ForCtorParam("ZipCode", options => options.MapFrom(source => source.ZipCode))
            .ForCtorParam("Country", options => options.MapFrom(source => source.Country));

        // EmergencyContact -> EmergencyContactDto
        CreateMap<EmergencyContact, EmergencyContactDto>()
            .ForCtorParam("Name", options => options.MapFrom(source => source.Name))
            .ForCtorParam("Relationship", options => options.MapFrom(source => source.Relationship))
            .ForCtorParam("PhoneNumber", options => options.MapFrom(source => source.PhoneNumber))
            .ForCtorParam("Email", options => options.MapFrom(source => source.Email));

        // Insurance -> InsuranceDto
        CreateMap<Insurance, InsuranceDto>()
            .ForCtorParam("Provider", options => options.MapFrom(source => source.Provider))
            .ForCtorParam("PolicyNumber", options => options.MapFrom(source => source.PolicyNumber))
            .ForCtorParam("GroupNumber", options => options.MapFrom(source => source.GroupNumber))
            .ForCtorParam("PlanName", options => options.MapFrom(source => source.PlanName))
            .ForCtorParam("EffectiveDate", options => options.MapFrom(source => source.EffectiveDate))
            .ForCtorParam("ExpirationDate", options => options.MapFrom(source => source.ExpirationDate));
    }
}
