package com.example.realtimechat.model;

public class UserStatus {
    private String username;
    private boolean online;

    public UserStatus() {}
    public UserStatus(String username, boolean online) {
        this.username = username;
        this.online = online;
    }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public boolean isOnline() { return online; }
    public void setOnline(boolean online) { this.online = online; }
}
