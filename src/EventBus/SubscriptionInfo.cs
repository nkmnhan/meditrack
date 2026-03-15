namespace MediTrack.EventBus;

public sealed record SubscriptionInfo(Type HandlerType)
{
    public static SubscriptionInfo Typed(Type handlerType) => new(handlerType);
}
