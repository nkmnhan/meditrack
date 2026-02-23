using Appointment.API.Dtos;
using AutoMapper;
using AppointmentEntity = Appointment.API.Models.Appointment;

namespace Appointment.API.Mapping;

/// <summary>
/// AutoMapper profile for mapping between Appointment entities and DTOs.
/// </summary>
public sealed class AppointmentMappingProfile : Profile
{
    public AppointmentMappingProfile()
    {
        // Entity -> Full Response
        CreateMap<AppointmentEntity, AppointmentResponse>()
            .ForMember(
                dest => dest.Status,
                opt => opt.MapFrom(src => src.Status.ToString()))
            .ForMember(
                dest => dest.Type,
                opt => opt.MapFrom(src => src.Type.ToString()));

        // Entity -> List Item Response
        CreateMap<AppointmentEntity, AppointmentListItemResponse>()
            .ForMember(
                dest => dest.Status,
                opt => opt.MapFrom(src => src.Status.ToString()))
            .ForMember(
                dest => dest.Type,
                opt => opt.MapFrom(src => src.Type.ToString()));
    }
}
