package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var BrokerAddress string

func main() {
	config, err := LoadConfig()
	if err != nil {
		log.Fatalf("failed to load configuration: %v", err)
	}

	db, err := setupDatabase(config.dbURL)
	if err != nil {
		log.Fatalf("Failed to setup database: %v", err)
	}

	ledger := NewLedger(db)
	signer, err := NewSigner(config.privateKeyHex)
	if err != nil {
		log.Fatalf("failed to initialise signer: %v", err)
	}

	// Initialize Prometheus metrics
	metrics := NewMetrics()
	// Map to store custody clients for later reference
	custodyClients := make(map[string]*Custody)

	for name, network := range config.networks {
		client, err := NewCustody(signer, ledger, network.InfuraURL, network.CustodyAddress, network.ChainID)
		if err != nil {
			log.Printf("Warning: Failed to initialize %s blockchain client: %v", name, err)
			continue
		}
		custodyClients[name] = client
		go client.ListenEvents(context.Background())
	}

	go metrics.RecordMetricsPeriodically(db, custodyClients)

	unifiedWSHandler := NewUnifiedWSHandler(signer, ledger, metrics)
	http.HandleFunc("/ws", unifiedWSHandler.HandleConnection)

	// Set up a separate mux for metrics
	metricsMux := http.NewServeMux()
	metricsMux.Handle("/metrics", promhttp.Handler())

	// Start metrics server on a separate port
	metricsServer := &http.Server{
		Addr:    ":4242",
		Handler: metricsMux,
	}
	go func() {
		log.Printf("Prometheus metrics available at http://localhost:4242/metrics")
		if err := metricsServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("Error starting metrics server: %v", err)
		}
	}()

	// Start the main HTTP server.
	go func() {
		log.Printf("Starting server, visit http://localhost:8000")
		if err := http.ListenAndServe(":8000", nil); err != nil {
			log.Fatal(err)
		}
	}()

	// Wait for shutdown signal.
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	log.Println("Shutting down...")

	// Shutdown metrics server
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := metricsServer.Shutdown(ctx); err != nil {
		log.Printf("Error shutting down metrics server: %v", err)
	}

	unifiedWSHandler.CloseAllConnections()
	log.Println("Server stopped")
}
