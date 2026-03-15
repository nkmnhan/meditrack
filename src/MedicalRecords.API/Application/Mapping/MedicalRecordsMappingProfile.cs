using MediTrack.MedicalRecords.API.Application.Models;
using MediTrack.MedicalRecords.Domain.Aggregates;
using AutoMapper;

namespace MediTrack.MedicalRecords.API.Application.Mapping;

/// <summary>
/// AutoMapper profile for medical records.
/// </summary>
public sealed class MedicalRecordsMappingProfile : Profile
{
    public MedicalRecordsMappingProfile()
    {
        // MedicalRecord -> Full Response
        CreateMap<MedicalRecord, MedicalRecordResponse>()
            .ForMember(
                dest => dest.Severity,
                opt => opt.MapFrom(src => src.Severity.ToString()))
            .ForMember(
                dest => dest.Status,
                opt => opt.MapFrom(src => src.Status.ToString()));

        // MedicalRecord -> List Item Response
        CreateMap<MedicalRecord, MedicalRecordListItemResponse>()
            .ForMember(
                dest => dest.Severity,
                opt => opt.MapFrom(src => src.Severity.ToString()))
            .ForMember(
                dest => dest.Status,
                opt => opt.MapFrom(src => src.Status.ToString()));

        // Child entities
        CreateMap<ClinicalNote, ClinicalNoteResponse>();

        CreateMap<Prescription, PrescriptionResponse>()
            .ForMember(
                dest => dest.Status,
                opt => opt.MapFrom(src => src.Status.ToString()));

        CreateMap<VitalSigns, VitalSignsResponse>();

        CreateMap<Attachment, AttachmentResponse>();
    }
}
