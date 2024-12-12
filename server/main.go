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
	InitializeServer(":8081")
}

func InitializeServer(port string) {
	if err := godotenv.Load(".env"); err != nil {
		log.Fatal("Error loading env file")
	}

	lib.GetInstanceLocation(port)
	ctx := context.Background()
	lib.ConnectDb(ctx)

	r := mux.NewRouter()

	r.HandleFunc("/websocket", ws.WebsocketHandler)
	r.Methods("POST").Path("/api/v1/auth/signup").HandlerFunc(auth.Signup)
	r.Methods("POST").Path("/api/v1/auth/signin").HandlerFunc(auth.Signin)
	r.Methods("POST").Path("/api/v1/auth/check").HandlerFunc(auth.CheckEmail)
	r.Methods("GET").Path("/api/v1/auth/me").HandlerFunc(auth.VerifyToken)
	r.Methods("POST").Path("/api/v1/meet").HandlerFunc(meet.CreateMeet)
	r.Methods("PUT").Path("/api/v1/meet/{meetId}").HandlerFunc(meet.UpdateMeetDetails)
	r.Methods("GET").Path("/api/v1/meet/{meetId}").HandlerFunc(meet.GetMeetDetails)
	r.Methods("GET").Path("/api/v1/connections").HandlerFunc(ws.GetConnections(port))

	r.Methods("GET").Path("/").HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		lib.WriteJson(w, http.StatusOK, map[string]string{
			"message": "Server is up and running successfully",
		})
	})
	corsHandler := handlers.CORS(
		handlers.AllowedOrigins([]string{"http://localhost:3000"}),
		handlers.AllowedMethods([]string{"GET", "POST", "PUT", "OPTIONS"}),
		handlers.AllowedHeaders([]string{"Origin", "Content-Type", "Authorization"}),
	)(r)

	loggingHandler := handlers.LoggingHandler(os.Stdout, corsHandler)

	server := &http.Server{
		Addr:    port,
		Handler: loggingHandler,
	}

	if err := server.ListenAndServe(); err != nil {
		log.Fatal("Something went wrong while starting server: ", err.Error())
	}
}
