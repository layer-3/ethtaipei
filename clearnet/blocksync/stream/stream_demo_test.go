package stream_test

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

	"github.com/layer-3/ethtaipei/clearnet/blocksync/stream"
)

// Generator pushes a sequence of numbers starting with 'from' and ending with 'to' values.
func Generator(from, to int) stream.Source[int] {
	return func() <-chan int {
		out := make(chan int, 5)
		go func() {
			defer close(out)
			for i := from; i <= to; i++ {
				out <- i
			}
		}()
		return out
	}
}

// Square computes x^2
func Square(input <-chan int) <-chan int {
	out := make(chan int, 5)
	go func() {
		defer close(out)
		for val := range input {
			out <- val * val
		}
	}()
	return out
}

// Double computes 2x
func Double(input <-chan int) <-chan int {
	out := make(chan int, 5)
	go func() {
		defer close(out)
		for val := range input {
			out <- val * 2
		}
	}()
	return out
}

// Increment computes x + 1
func Increment(input <-chan int) <-chan int {
	out := make(chan int, 5)
	go func() {
		defer close(out)
		for val := range input {
			out <- val + 1
		}
	}()
	return out
}

// Dump is a helper function that creates a sink and a channel to collect events.
func Dump[T any]() (stream.Sink[T], <-chan T) {
	out := make(chan T, 5)
	sink := func(input <-chan T) {
		defer close(out)
		for val := range input {
			out <- val
		}
	}
	return sink, out
}

// TestDemo is an end-to-end test that constructs a complex multi-stage
// computation graph that leverages all package functions and primitives.
//
// This test will:
//  1. Generate numbers from two different sources.
//  2. Merge them into one pipeline.
//  3. Apply two transformations: Square and Double.
//  4. Merge the results of Square and Double -> Increment.
//  5. Connect sources to sinks using Drain.
//  6. Verify the results by counting the number of events received by each sink.
//
// Graph structure:
//
//	(Source: 1..5)   (Source: 10..15)
//	            \      /
//	            [Merge]
//	               |
//	  [Branch: Square | Double]
//	            /          \
//	       [Square]      [Map: Double -> Increment]
//	          |   \      /  |
//	          |   [Merge]   |
//	       (Sink1)   |   (Sink2)
//	                 |
//	              (Sink3)
func TestDemo(t *testing.T) {
	// Two sources generating numbers
	source1 := Generator(1, 5)
	source2 := Generator(10, 15)

	// Merge both sources
	mergedSource := stream.Merge(source1, source2)

	// Apply transformations
	squaredPipeline := stream.Pipe(mergedSource, Square)
	doubledPipeline := stream.Pipe(mergedSource, Double)
	incrementedPipeline := stream.Pipe(doubledPipeline, Increment)

	// Merge Square and Double -> Increment
	mergedTransformed := stream.Merge(squaredPipeline, incrementedPipeline)

	// Define sinks
	sink1, squaredOutput := Dump[int]()
	sink2, mergedOutput := Dump[int]()
	sink3, incrementedOutput := Dump[int]()

	// Use Drain to connect sources to sinks
	stream.Drain(squaredPipeline, sink1)
	stream.Drain(mergedTransformed, sink2)
	stream.Drain(incrementedPipeline, sink3)

	// Wait for the pipeline to finish
	var squaredCount, mergedCount, incrementedCount int
	var squaredDone, mergedDone, incrementedDone bool

	for !squaredDone || !mergedDone || !incrementedDone {
		select {
		case _, ok := <-squaredOutput:
			if !ok {
				squaredDone = true
				break
			}
			squaredCount++
		case _, ok := <-mergedOutput:
			if !ok {
				mergedDone = true
				break
			}
			mergedCount++
		case _, ok := <-incrementedOutput:
			if !ok {
				incrementedDone = true
				break
			}
			incrementedCount++
		case <-time.After(10 * time.Millisecond):
			t.Fatal("expected event, but got none")
		}
	}

	const total = 11
	assert.Equal(t, total, squaredCount)
	assert.Equal(t, total, incrementedCount)
	assert.Equal(t, 2*total, mergedCount)
}
