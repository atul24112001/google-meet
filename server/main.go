package main

import (
	"context"
	"google-meet/auth"
	"google-meet/lib"
	"google-meet/meet"
	"google-meet/ws"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(".env"); err != nil {
		log.Fatal("Error loading env file")
	}

	ctx := context.Background()
	lib.ConnectDb(ctx)

	r := mux.NewRouter()

	r.HandleFunc("/websocket", ws.WebsocketHandler)
	r.Methods("POST").Path("/api/v1/auth/signup").HandlerFunc(auth.Signup)
	r.Methods("POST").Path("/api/v1/auth/signin").HandlerFunc(auth.Signin)
	r.Methods("POST").Path("/api/v1/auth/check").HandlerFunc(auth.CheckEmail)
	r.Methods("GET").Path("/api/v1/auth/me").HandlerFunc(auth.VerifyToken)
	r.Methods("POST").Path("/api/v1/meet").HandlerFunc(meet.CreateMeet)
	r.Methods("GET").Path("/api/v1/meet/{meetId}").HandlerFunc(meet.GetMeetDetails)
	r.Methods("GET").Path("/api/v1/connections").HandlerFunc(ws.GetConnections)

	corsHandler := handlers.CORS(
		handlers.AllowedOrigins([]string{"http://localhost:3000"}),
		handlers.AllowedMethods([]string{"GET", "POST", "OPTIONS"}),
		handlers.AllowedHeaders([]string{"Origin", "Content-Type", "Authorization"}),
	)(r)

	loggingHandler := handlers.LoggingHandler(os.Stdout, corsHandler)

	server := &http.Server{
		Addr:    ":8080",
		Handler: loggingHandler,
	}

	if err := server.ListenAndServe(); err != nil {
		log.Fatal("Something went wrong while starting server: ", err.Error())
	}
}
