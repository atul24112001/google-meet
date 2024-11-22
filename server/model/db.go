package model

type User struct {
	Id       string `json:"id"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	OTP      string `json:"otp"`
}

type Meet struct {
	Id        string `json:"id"`
	StartsAt  string `json:"startsAt"`
	CreatedAt string `json:"createdAt"`
	UserId    string `json:"userId"`
}
