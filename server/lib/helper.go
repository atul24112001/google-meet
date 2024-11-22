package lib

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt"
)

func WriteJson(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	if err := json.NewEncoder(w).Encode(data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func ErrorJson(w http.ResponseWriter, status int, message string) error {
	out, err := json.Marshal(map[string]interface{}{
		"message": message,
	})
	if err != nil {
		return err
	}

	w.WriteHeader(status)
	_, err = w.Write(out)
	if err != nil {
		return err
	}
	return nil
}

func ReadJsonFromBody(w http.ResponseWriter, r *http.Request, body any) error {
	bodyByte, err := io.ReadAll(r.Body)
	if err != nil {
		return errors.New("failed to read request body")
	}
	defer r.Body.Close()

	if err := json.Unmarshal(bodyByte, &body); err != nil {
		return errors.New("invalid JSON format")
	}
	return nil
}

func HashString(str string) string {
	hash := sha256.New()
	finalString := fmt.Sprintf("%s-%s", os.Getenv("SECRET"), str)
	hash.Write([]byte(finalString))
	hashedBytes := hash.Sum(nil)
	hashedString := hex.EncodeToString(hashedBytes)
	return hashedString
}

func GenerateToken(id string) (string, error) {
	var JWT_SECRET = []byte(os.Getenv("SECRET"))
	expirationTime := time.Now().Add(60 * 24 * 30 * time.Minute)
	claims := &TokenPayload{
		Id: id,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: expirationTime.Unix(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(JWT_SECRET)

	if err != nil {
		return "", err
	}
	return tokenString, nil
}

type TokenPayload struct {
	Id string `json:"id"`
	jwt.StandardClaims
}
