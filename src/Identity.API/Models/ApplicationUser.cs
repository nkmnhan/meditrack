using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;

namespace MediTrack.Identity.Models;

public class ApplicationUser : IdentityUser
{
    [Required]
    [MaxLength(100)]
    public string FirstName { get; set; } = default!;

    [Required]
    [MaxLength(100)]
    public string LastName { get; set; } = default!;

    public DateTimeOffset? LastLoginAt { get; set; }
}
