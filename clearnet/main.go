package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
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

	resizer := NewResizeWorker(ledger, signer)
	for name, network := range config.networks {
		client, err := NewCustody(signer, ledger, network.InfuraURL, network.CustodyAddress, network.ChainID)
		if err != nil {
			log.Printf("Warning: Failed to initialize %s blockchain client: %v", name, err)
			continue
		}
		go client.ListenEvents(context.Background())
		resizer.AddCustody(client)
	}

	// Resize one channel with the biggest broker allocation every minute to keep custody healthy.
	go resizer.Run(1 * time.Minute)

	unifiedWSHandler := NewUnifiedWSHandler(signer, ledger)
	http.HandleFunc("/ws", unifiedWSHandler.HandleConnection)

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
	unifiedWSHandler.CloseAllConnections()
	log.Println("Server stopped")
}
