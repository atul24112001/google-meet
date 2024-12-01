package query

import (
	"context"
	"encoding/json"
	"fmt"
	"google-meet/lib"
	"google-meet/model"
	"log"
	"time"
)

func GetMeetingById(_ctx context.Context, meetId string) (model.Meet, error) {
	redisMeetingKey := fmt.Sprintf("google-meet:meet:%s", meetId)
	cmd := lib.RedisClient.Get(context.Background(), redisMeetingKey)
	var meet model.Meet

	if cmd.Err() == nil {
		if meetString, err := cmd.Result(); err != nil {
			err := json.Unmarshal([]byte(meetString), &meet)
			log.Println("22", err.Error())
			lib.RedisClient.Del(context.Background(), redisMeetingKey)
			return meet, err
		}
	}
	log.Println("26", cmd.Err())
	row := lib.Pool.QueryRow(context.Background(), `SELECT id, "userId" FROM public.meets WHERE id = $1`, meetId)
	if err := row.Scan(&meet.Id, &meet.UserId); err != nil {
		log.Printf("Error querying meets: %v\n", err)
		return meet, err
	}

	meetBytes, err := json.Marshal(meet)
	if err == nil {
		lib.RedisClient.Set(context.Background(), redisMeetingKey, string(meetBytes), time.Hour*24)

	} else {
		log.Println("33", err.Error())
	}
	return meet, nil
}
