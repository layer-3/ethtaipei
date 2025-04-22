package stream_test

import (
	"sync"
	"testing"

	"github.com/layer-3/ethtaipei/clearnet/blocksync/stream"
)

// Helper function to create a simple source
func generateSource[T any](values ...T) stream.Source[T] {
	return func() <-chan T {
		ch := make(chan T, len(values))
		go func() {
			for _, v := range values {
				ch <- v
			}
			close(ch)
		}()
		return ch
	}
}

// TestMerge checks if multiple sources are correctly merged.
func TestMerge(t *testing.T) {
	source1 := generateSource(1, 2, 3)
	source2 := generateSource(4, 5, 6)
	merged := stream.Merge(source1, source2)()

	result := make(map[int]bool)
	for val := range merged {
		result[val] = true
	}

	expected := map[int]bool{1: true, 2: true, 3: true, 4: true, 5: true, 6: true}
	if len(result) != len(expected) {
		t.Errorf("Expected %v, got %v", expected, result)
	}

	for val := range expected {
		if !result[val] {
			t.Errorf("Missing value %d in merged output", val)
		}
	}
}

// TestTee verifies that input is distributed to multiple sinks.
func TestTee(t *testing.T) {
	source := generateSource(1, 2, 3)()
	var wg sync.WaitGroup

	collector1 := make([]int, 0)
	collector2 := make([]int, 0)

	mu := sync.Mutex{}
	sink1 := func(ch <-chan int) {
		defer wg.Done()
		for val := range ch {
			mu.Lock()
			collector1 = append(collector1, val)
			mu.Unlock()
		}
	}

	sink2 := func(ch <-chan int) {
		defer wg.Done()
		for val := range ch {
			mu.Lock()
			collector2 = append(collector2, val)
			mu.Unlock()
		}
	}

	wg.Add(2)
	stream.Tee(source, sink1, sink2)
	wg.Wait()

	if len(collector1) != 3 || len(collector2) != 3 {
		t.Errorf("Tee did not distribute values correctly: %v, %v", collector1, collector2)
	}
}

// TestPipe verifies that a transformation is applied to a source.
func TestPipe(t *testing.T) {
	transform := func(input <-chan int) <-chan string {
		out := make(chan string, 10)
		go func() {
			for val := range input {
				out <- "num:" + string(rune(val+'0')) // Basic conversion to string
			}
			close(out)
		}()
		return out
	}

	source := generateSource(1, 2, 3)
	piped := stream.Pipe(source, transform)()

	expected := []string{"num:1", "num:2", "num:3"}
	result := make([]string, 0)

	for val := range piped {
		result = append(result, val)
	}

	if len(result) != len(expected) {
		t.Errorf("Expected %v, got %v", expected, result)
	}
}

// TestMergeWithEmptySource checks handling of empty sources
func TestMergeWithEmptySource(t *testing.T) {
	emptySource := generateSource[int]()
	source := generateSource(7, 8, 9)

	merged := stream.Merge(emptySource, source)()
	expected := []int{7, 8, 9}
	result := make([]int, 0)

	for val := range merged {
		result = append(result, val)
	}

	if len(result) != len(expected) {
		t.Errorf("Expected %v, got %v", expected, result)
	}
}

// TestTeeWithEmptyChannel checks Tee behavior with an empty channel
func TestTeeWithEmptyChannel(t *testing.T) {
	emptySource := generateSource[int]()()
	var wg sync.WaitGroup

	collector := make([]int, 0)
	sink := func(ch <-chan int) {
		defer wg.Done()
		for val := range ch {
			collector = append(collector, val)
		}
	}

	wg.Add(1)
	stream.Tee(emptySource, sink)
	wg.Wait()

	if len(collector) != 0 {
		t.Errorf("Expected empty collector, got %v", collector)
	}
}

// TestPipeWithEmptySource checks Pipe behavior with an empty source
func TestPipeWithEmptySource(t *testing.T) {
	emptySource := generateSource[int]()
	transform := func(input <-chan int) <-chan int {
		out := make(chan int, 10)
		go func() {
			for val := range input {
				out <- val * 2
			}
			close(out)
		}()
		return out
	}

	piped := stream.Pipe(emptySource, transform)()
	result := make([]int, 0)

	for val := range piped {
		result = append(result, val)
	}

	if len(result) != 0 {
		t.Errorf("Expected empty result, got %v", result)
	}
}

// TestMergeConcurrency ensures that Merge handles concurrency properly.
func TestMergeConcurrency(t *testing.T) {
	source1 := func() <-chan int {
		ch := make(chan int, 10)
		go func() {
			for i := 0; i < 100; i++ {
				ch <- i
			}
			close(ch)
		}()
		return ch
	}

	source2 := func() <-chan int {
		ch := make(chan int, 10)
		go func() {
			for i := 100; i < 200; i++ {
				ch <- i
			}
			close(ch)
		}()
		return ch
	}

	merged := stream.Merge(source1, source2)()
	result := make(map[int]bool)

	for val := range merged {
		result[val] = true
	}

	if len(result) != 200 {
		t.Errorf("Expected 200 unique values, got %d", len(result))
	}
}

// TestTeeConcurrency ensures Tee works concurrently without data loss.
func TestTeeConcurrency(t *testing.T) {
	source := generateSource(1, 2, 3, 4, 5, 6)()
	var wg sync.WaitGroup

	mu := sync.Mutex{}
	collector1 := make([]int, 0)
	collector2 := make([]int, 0)

	sink1 := func(ch <-chan int) {
		defer wg.Done()
		for val := range ch {
			mu.Lock()
			collector1 = append(collector1, val)
			mu.Unlock()
		}
	}

	sink2 := func(ch <-chan int) {
		defer wg.Done()
		for val := range ch {
			mu.Lock()
			collector2 = append(collector2, val)
			mu.Unlock()
		}
	}

	wg.Add(2)
	stream.Tee(source, sink1, sink2)
	wg.Wait()

	if len(collector1) != 6 || len(collector2) != 6 {
		t.Errorf("Expected all values in both collectors, got %v and %v", collector1, collector2)
	}
}

// TestThen ensures that transformations are correctly chained.
func TestThen(t *testing.T) {
	// First transformation: doubles the number
	double := func(input <-chan int) <-chan int {
		out := make(chan int, 10)
		go func() {
			for val := range input {
				out <- val * 2
			}
			close(out)
		}()
		return out
	}

	// Second transformation: converts to string
	toString := func(input <-chan int) <-chan string {
		out := make(chan string, 10)
		go func() {
			for val := range input {
				out <- "val:" + string(rune(val+'0'))
			}
			close(out)
		}()
		return out
	}

	// Chain transformations
	combined := stream.Then(double, toString)
	source := generateSource(1, 2, 3)
	piped := stream.Pipe(source, combined)()

	expected := []string{"val:2", "val:4", "val:6"}
	result := make([]string, 0)

	for val := range piped {
		result = append(result, val)
	}

	if len(result) != len(expected) {
		t.Errorf("Expected %v, got %v", expected, result)
	}
}

// TestDrain ensures that a source properly sends values to a sink.
func TestDrain(t *testing.T) {
	source := generateSource(10, 20, 30)
	var wg sync.WaitGroup

	collector := make([]int, 0)
	mu := sync.Mutex{}

	sink := func(ch <-chan int) {
		defer wg.Done()
		for val := range ch {
			mu.Lock()
			collector = append(collector, val)
			mu.Unlock()
		}
	}

	wg.Add(1)
	stream.Drain(source, sink)

	wg.Wait()
	expected := []int{10, 20, 30}

	if len(collector) != len(expected) {
		t.Errorf("Expected %v, got %v", expected, collector)
	}
}

// TestDrainWithEmptySource verifies that Drain handles an empty source correctly.
func TestDrainWithEmptySource(t *testing.T) {
	emptySource := generateSource[int]()
	var wg sync.WaitGroup

	collector := make([]int, 0)
	sink := func(ch <-chan int) {
		defer wg.Done()
		for val := range ch {
			collector = append(collector, val)
		}
	}

	wg.Add(1)
	stream.Drain(emptySource, sink)
	wg.Wait()

	if len(collector) != 0 {
		t.Errorf("Expected empty collector, got %v", collector)
	}
}

// TestThenWithEmptySource verifies that Then behaves correctly with an empty input.
func TestThenWithEmptySource(t *testing.T) {
	double := func(input <-chan int) <-chan int {
		out := make(chan int, 10)
		go func() {
			for val := range input {
				out <- val * 2
			}
			close(out)
		}()
		return out
	}

	increment := func(input <-chan int) <-chan int {
		out := make(chan int, 10)
		go func() {
			for val := range input {
				out <- val + 1
			}
			close(out)
		}()
		return out
	}

	combined := stream.Then(double, increment)
	emptySource := generateSource[int]()
	piped := stream.Pipe(emptySource, combined)()

	result := make([]int, 0)
	for val := range piped {
		result = append(result, val)
	}

	if len(result) != 0 {
		t.Errorf("Expected empty result, got %v", result)
	}
}

// TestThenConcurrency ensures that Then can handle concurrent input.
func TestThenConcurrency(t *testing.T) {
	double := func(input <-chan int) <-chan int {
		out := make(chan int, 10)
		go func() {
			for val := range input {
				out <- val * 2
			}
			close(out)
		}()
		return out
	}

	increment := func(input <-chan int) <-chan int {
		out := make(chan int, 10)
		go func() {
			for val := range input {
				out <- val + 1
			}
			close(out)
		}()
		return out
	}

	combined := stream.Then(double, increment)
	source := func() <-chan int {
		ch := make(chan int, 10)
		go func() {
			for i := 0; i < 1000; i++ {
				ch <- i
			}
			close(ch)
		}()
		return ch
	}

	piped := stream.Pipe(source, combined)()
	expectedLength := 1000
	count := 0

	for range piped {
		count++
	}

	if count != expectedLength {
		t.Errorf("Expected %d values, got %d", expectedLength, count)
	}
}

// TestDrainConcurrency ensures Drain properly handles concurrent writes.
func TestDrainConcurrency(t *testing.T) {
	source := func() <-chan int {
		ch := make(chan int, 10)
		go func() {
			for i := 0; i < 1000; i++ {
				ch <- i
			}
			close(ch)
		}()
		return ch
	}

	var wg sync.WaitGroup
	mu := sync.Mutex{}
	collector := make([]int, 0)

	sink := func(ch <-chan int) {
		defer wg.Done()
		for val := range ch {
			mu.Lock()
			collector = append(collector, val)
			mu.Unlock()
		}
	}

	wg.Add(1)
	stream.Drain(source, sink)
	wg.Wait()

	if len(collector) != 1000 {
		t.Errorf("Expected 1000 values, got %d", len(collector))
	}
}
