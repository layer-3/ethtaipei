# Stream Package

The **stream** package provides a generic framework for constructing type-safe,
channel-based data processing workflows in Go. It leverages Go’s natural
concurrency features by using channels to pass data between processing
stages—allowing each goroutine to exclusively own its state—rather than sharing
memory with locks.

> “Do not communicate by sharing memory; instead, share memory by
> communicating.” — [Go Proverbs](https://go-proverbs.github.io/) by Rob Pike

## Overview

The package is built around a few key abstractions:

- **Source**: A function that produces values on a channel.
- **Sink**: A function that consumes values from a channel.
- **Transform**: A processing stage that converts inputs to outputs.

These building blocks are combined using helper functions:

- **Merge**: Combines multiple sources into one (fan-in).
- **Tee**: Duplicates a channel’s output to multiple sinks (fan-out).
- **Pipe**: Connects a source to a transformation.
- **Then**: Chains transformations together (map).
- **Drain**: Connects a source to a sink, running the flow concurrently.

## Channels vs. Mutexes

### Why Channels for High-Level Components?

- **Exclusive Ownership**: Each goroutine manages its own state and only
  communicates through channels.
- **Avoids Contention**: By passing messages, you avoid the race conditions and
  deadlocks that can occur with shared mutable state.
- **Simpler Concurrency**: Channels make it easier to design an event-driven
  system where components interact via clear boundaries.

### When to Use Mutexes

- **Low-Level Data Structures**: For performance-critical components like caches
  or ring buffers, mutexes may be more efficient.
- **Tightly Scoped Sharing**: If only a small, well-contained piece of data is
  shared, the overhead of channels might not be justified.

> **Guideline**: Use channels for orchestrating your application’s high-level
> behavior and reserve mutexes for isolated, low-level performance tweaks.

## Pipeline Model

The pipeline model in the **stream** package lets you compose multiple stages of
data processing where each stage runs concurrently. For example:

- **Generator**: A source of data.
- **Transformers**: Stages that process data, such as squaring or doubling
  numbers.
- **Sinks**: Endpoints that collect or act on the data.

## Usage Examples

Below is a dead simple example that demonstrates how to use the **stream**
package. For more detailed examples and additional usage patterns, please refer
to the inline documentation and test cases provided in the package.

In this dead simple example, we define:

1. A source that generates numbers from 1 to 5.
2. A transform that increments each number.
3. A sink that prints the final output.

```go
package main

import (
	"fmt"
	"github.com/layer-3/ethtaipei/clearnet/blocksync/stream"
)

// Source generates numbers 1 to 5.
func Source() <-chan int {
    ch := make(chan int, 5)
    go func() {
        defer close(ch)
        for i := 1; i <= 5; i++ {
            ch <- i
        }
    }()
    return ch
}

// Increment is a simple transform that increments each number.
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

func main() {
	// Build the pipeline by connecting the source to the transform.
	pipeline := stream.Pipe(Source, Increment)

	// Consume and print the output from the pipeline.
	for n := range pipeline() {
		fmt.Println("Output:", n)
	}
}
```
