package stream

import (
	"context"
)

type Topic string

// Subscription is a handle to a stream of events of type T.
// It provides methods to unsubscribe, access the event channel,
// and listen for errors.
type Subscription[T any] interface {
	// Unsubscribe stops delivery of events to this subscriber.
	Unsubscribe()

	// Event returns a channel from which events of type T can be read.
	Event() <-chan T

	// Err returns a channel that emits any errors encountered
	// during the subscription lifecycle.
	Err() <-chan error
}

// Producer defines the interface for a stream producer of events of type T.
// It can be started/stopped, and supports subscribing to a particular topic.
type Producer[T any] interface {
	// Start begins any background goroutines required for producing events,
	// taking a parent context for cancellation.
	Start(ctx context.Context)

	// Stop cancels production and cleans up resources.
	Stop()

	// Subscribe adds a new subscription to the given topic.
	// The returned Subscription will receive events of type T.
	Subscribe(Topic) (Subscription[T], error)
	Unsubscribe(Topic, Subscription[T]) error
}
