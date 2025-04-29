# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Test Commands
- Check compilation: `go vet`
- Build: `go build`
- Run: `go run .`
- Test all: `go test ./...`
- Test single file: `go test -v ./path/to/file_test.go`
- Test specific function: `go test -v -run TestFunctionName`
- Run with race detector: `go test -race ./...`

## Code Style Guidelines
- Follow standard Go conventions (gofmt)
- Use `any` type alias instead of `interface{}`
- PascalCase for exported identifiers, camelCase for unexported
- Error handling: Return errors, don't panic in normal operation
- Imports: standard library first, then external packages
- Variable naming: descriptive, avoid single-letter except for loops
- Structs: Group related fields, add JSON tags for serialization
- DB models use `DB` prefix (e.g., `DBChannel`)
- Functions: Small, single-purpose, clear documentation
- Tests: Use github.com/stretchr/testify/require for critical assertions that should terminate tests immediately, github.com/stretchr/testify/assert for non-critical checks that allow tests to continue. Use in-memory SQLite for DB tests

## Comments
Only add comments that provide additional context or explain complex logic. Here's what constitute a bad comment:
- Comment repeats the code verbatim without adding information  
- Comment explains obvious language syntax  
- Comment restates the function or variable name  
- Comment describes behavior that is immediately apparent from reading the code  
- Comment is outdated or no longer matches the code  
- Comment explains a standard library function without adding context  
- Comment provides unnecessary detail on simple operations  
- Comment states the obvious purpose of a common pattern (e.g., loop iteration)  
- Comment paraphrases a one-liner  
- Comment describes a refactored-away or deleted section  
- Comment exists solely to satisfy a documentation requirement without adding value  
- Comment is used where code should be self-explanatory via naming and structure
