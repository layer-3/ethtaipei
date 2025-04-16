package blocksync

import (
	"fmt"
	"testing"
	"time"

	"github.com/layer-3/ethtaipei/clearnet/blocksync/stream"
)

func RequireNoErrorChan(ch <-chan error) {
	select {
	case err := <-ch:
		fmt.Printf("unexpected error: %v", err)
		return
	default:
	}
}

const DEFAULT_TIMEOUT = 1 * time.Second
const DEFAULT_EXTRA_EVENT_TIMEOUT = 100 * time.Millisecond

func ValidateEvents[T any](t *testing.T, sub stream.Subscription[T], numEvents int, condition func(idx int, ev T)) {
	for i := 0; i < numEvents; i++ {
		select {
		case event, ok := <-sub.Event():
			if !ok {
				t.Fatalf("channel closed before reading event #%d", i)
			}
			condition(i, event)
		case err := <-sub.Err():
			if err != nil {
				t.Fatalf("error during capturing event: %v", err)
			}
		case <-time.After(DEFAULT_TIMEOUT):
			t.Fatalf("timeout waiting for event %d", i)
		}
	}
}

func ValidateEventsExactNum[T any](t *testing.T, sub stream.Subscription[T], numEvents int, condition func(idx int, ev T)) {
	ValidateEvents(t, sub, numEvents, condition)

	select {
	case extraEvent := <-sub.Event():
		t.Fatalf("unexpected extra event after reading %d events: %v", numEvents, extraEvent)
	case err := <-sub.Err():
		if err != nil {
			t.Fatalf("unexpected error after reading %d events: %v", numEvents, err)
		}
	case <-time.After(DEFAULT_EXTRA_EVENT_TIMEOUT):
		// No extra events arrived => success!
	}
}
