package main

import (
	wails "github.com/wailsapp/wails/v2"
)

type Device struct {
	Name string `json:"name"`
}

// KoboService provides Kobo related functionality
type KoboService struct {
	runtime *wails.Runtime
}

func NewKoboService() *KoboService {
	return &KoboService{}
}

func (k *KoboService) GetDevices() ([]Device, error) {
	var devices []Device
	devices = append(devices, Device{Name: "Kobo 123"})
	return devices, nil
}