using Microsoft.AspNetCore.Mvc.Filters;

namespace Clara.API.Infrastructure;

/// <summary>
/// Filter attribute that restricts access to development environment only.
/// Returns 404 in non-development environments (per CLAUDE.md - don't leak existence of dev endpoints).
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class DevOnlyAttribute : ActionFilterAttribute
{
    public override void OnActionExecuting(ActionExecutingContext context)
    {
        var environment = context.HttpContext.RequestServices.GetRequiredService<IWebHostEnvironment>();

        if (!environment.IsDevelopment())
        {
            context.Result = new Microsoft.AspNetCore.Mvc.NotFoundResult();
        }
    }
}
