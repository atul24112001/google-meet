package middleware

import (
	"errors"
	"fmt"
	"google-meet/lib"
	"google-meet/model"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt"
)

func CheckAuth(r *http.Request) (model.User, error) {
	tokenArr := strings.Split(r.Header.Get("Authorization"), " ")
	if len(tokenArr) < 2 {
		return model.User{}, errors.New("unauthorized")
	}
	tokenString := tokenArr[1]

	if tokenString == "" {
		return model.User{}, errors.New("unauthorized")
	}

	claims := &lib.TokenPayload{}

	token, err := jwt.ParseWithClaims(tokenString, claims, (func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(os.Getenv("SECRET")), nil

	}))
	if err != nil {
		return model.User{}, err
	}
	if !token.Valid {
		return model.User{}, errors.New("unauthorized")
	}
	var user model.User
	err = lib.Pool.QueryRow(r.Context(), `SELECT id, name, email, password FROM public.users WHERE id = $1`, claims.Id).Scan(&user.Id, &user.Name, &user.Email)
	if err != nil {
		log.Println(err.Error())
		return model.User{}, errors.New("internal server error")
	}

	return user, nil
}
