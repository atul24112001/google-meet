package query

import (
	"context"
	"encoding/json"
	"fmt"
	"google-meet/lib"
	"google-meet/model"
	"time"
)

func GetMeetingById(_ctx context.Context, meetId string) (model.Meet, error) {
	redisMeetingKey := fmt.Sprintf("google-meet:meet:%s", meetId)
	cmd := lib.RedisClient.Get(context.Background(), redisMeetingKey)
	var meet model.Meet

	if cmd.Err() == nil {
		if meetString, err := cmd.Result(); err != nil {
			err := json.Unmarshal([]byte(meetString), &meet)
			lib.RedisClient.Del(context.Background(), redisMeetingKey)
			return meet, err
		}
	}
	if err := lib.Pool.QueryRow(context.Background(), `SELECT id, "userId" FROM public.meets WHERE id = $1`, meetId).Scan(&meet.Id, &meet.UserId); err != nil {
		return meet, err
	}
	meetBytes, err := json.Marshal(meet)
	if err == nil {
		lib.RedisClient.Set(context.Background(), redisMeetingKey, string(meetBytes), time.Hour*24)
	}
	return meet, nil
}
