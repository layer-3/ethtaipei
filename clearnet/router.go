package main

import (
	"errors"
	"log"
	"sync"

	"github.com/centrifugal/centrifuge"
)

// Route defines a message forwarding route between participants
type Route struct {
	FromParticipant string
	ToParticipant   string
	ChannelID       string
}

// RouterInterface defines methods that must be implemented by a message router
type RouterInterface interface {
	AddRoute(from, to, channelID string) error
	GetRoute(from, to string) (string, bool)
	ForwardMessage(from, to string, message []byte, channelID ...string) error
}

// Router handles message routing between participants
type Router struct {
	node   *centrifuge.Node
	routes map[string]map[string]string // FromParticipant -> ToParticipant -> ChannelID
	mu     sync.RWMutex
}

// NewRouter creates a new router instance
func NewRouter(node *centrifuge.Node) *Router {
	return &Router{
		node:   node,
		routes: make(map[string]map[string]string),
		mu:     sync.RWMutex{},
	}
}

// AddRoute adds a new route for message forwarding
func (r *Router) AddRoute(from, to, channelID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Initialize the map for the sender if it doesn't exist
	if _, exists := r.routes[from]; !exists {
		r.routes[from] = make(map[string]string)
	}

	// Add or update the route
	r.routes[from][to] = channelID
	log.Printf("Added route: %s -> %s via channel %s", from, to, channelID)
	return nil
}

// GetRoute retrieves a route for the given participants
func (r *Router) GetRoute(from, to string) (string, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	// Check if we have routes for this sender
	if routes, exists := r.routes[from]; exists {
		// Check if we have a route to this recipient
		if channelID, routeExists := routes[to]; routeExists {
			return channelID, true
		}
	}

	return "", false
}

// ForwardMessage forwards a message from one participant to another
func (r *Router) ForwardMessage(from, to string, message []byte, channelID ...string) error {
	var targetChannel string

	// If channelID is explicitly provided, use it
	if len(channelID) > 0 && channelID[0] != "" {
		targetChannel = channelID[0]
	} else {
		// Otherwise look up the route
		var exists bool
		targetChannel, exists = r.GetRoute(from, to)
		if !exists {
			return errors.New("no route exists between participants")
		}
	}

	// Publish the message to the channel
	_, err := r.node.Publish(targetChannel, message)
	if err != nil {
		log.Printf("Error forwarding message: %v", err)
		return err
	}

	log.Printf("Forwarded message from %s to %s via channel %s", from, to, targetChannel)
	return nil
}
