package query

import (
	"context"
	"encoding/json"
	"fmt"
	"google-meet/lib"
	"google-meet/model"
	"time"
)

func GetUserById(ctx context.Context, userId string) (model.User, error) {
	var user model.User
	redisKey := fmt.Sprintf("google-meet:user:%s", userId)
	cmd := lib.RedisClient.Get(ctx, redisKey)
	err := cmd.Err()
	if cmd.Err() != nil {
		if err != nil {
			if err = lib.Pool.QueryRow(ctx, `SELECT id, name, email FROM public.users WHERE id = $1`, userId).Scan(&user.Id, &user.Name, &user.Email); err != nil {
				return user, err
			}
			userByte, err := json.Marshal(user)
			if err != nil {
				return user, err
			}

			lib.RedisClient.Set(ctx, redisKey, string(userByte), 24*time.Hour)
			return user, err
		}

	}
	userString, err := cmd.Result()
	if err != nil {
		return user, err
	}
	err = json.Unmarshal([]byte(userString), &user)
	return user, err
}
