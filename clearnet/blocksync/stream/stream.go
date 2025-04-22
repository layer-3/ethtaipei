// Package stream provides a generic framework
// for constructing type-safe, channel-based data processing workflows.
package stream

import "sync"

// Source represents a source of data that produces values.
type Source[T any] func() <-chan T

// Sink represents a sink that consumes values
type Sink[T any] func(<-chan T)

// Transform represents a processing stage that transforms inputs to an output type.
type Transform[In any, Out any] func(<-chan In) <-chan Out

// Merge combines multiple sources into a single source (aka fan-in).
func Merge[T any](sources ...Source[T]) Source[T] {
	return func() <-chan T {
		// Determine the maximum channel capacity among sources
		maxCap := 0
		channels := make([]<-chan T, len(sources))

		for i, source := range sources {
			channels[i] = source()
			if cap(channels[i]) > maxCap {
				maxCap = cap(channels[i])
			}
		}

		out := make(chan T, maxCap)
		var wg sync.WaitGroup
		wg.Add(len(sources))

		for _, ch := range channels {
			go func(ch <-chan T) {
				defer wg.Done()
				for val := range ch {
					out <- val
				}
			}(ch)
		}

		go func() {
			wg.Wait()
			close(out)
		}()

		return out
	}
}

// Tee sends the input to multiple sinks (aka fan-out).
func Tee[T any](input <-chan T, sinks ...Sink[T]) {
	if len(sinks) == 0 {
		return
	}

	// Create the necessary output channels for each sink
	outputs := make([]chan T, len(sinks))
	for i := range outputs {
		outputs[i] = make(chan T, cap(input))
	}

	// Duplicate the input channel to all output channels
	go func() {
		// Close all channels when done
		for _, output := range outputs {
			defer close(output)
		}

		// Send input to all output channels
		for n := range input {
			for _, output := range outputs {
				output <- n
			}
		}
	}()

	// Connect each output channel to a corresponding sink
	for i, sink := range sinks {
		go sink(outputs[i])
	}
}

// Pipe connects a source to a transformation stage (aka map).
func Pipe[In any, Out any](source Source[In], transform Transform[In, Out]) Source[Out] {
	return func() <-chan Out {
		return transform(source())
	}
}

// Then chains two transformations together.
func Then[A any, B any, C any](prev Transform[A, B], next Transform[B, C]) Transform[A, C] {
	return func(input <-chan A) <-chan C {
		return next(prev(input))
	}
}

// Drain connects a source to a sink.
func Drain[T any](source Source[T], sink Sink[T]) {
	go sink(source())
}
