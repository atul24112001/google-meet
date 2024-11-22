package lib

import (
	"context"
	"log"
	"os"

	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
)

var Pool *pgx.Conn
var RedisClient *redis.Client

func ConnectDb(ctx context.Context) {
	var err error = nil
	Pool, err = pgx.Connect(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatal("Error connecting database")
	}

	RedisClient = redis.NewClient(&redis.Options{
		Addr:     os.Getenv("REDIS_ADDRESS"),
		Password: os.Getenv("REDIS_PASSWORD"),
		DB:       0,
	})

	for i := 0; i < 3; i++ {
		cmd := RedisClient.Ping(ctx)
		if cmd.Err() == nil {
			break
		} else if i == 2 {
			log.Fatal("Error connecting to redis")
		}
	}

	log.Println("Connected to PostgreSQL & Redis successfully!")
}
