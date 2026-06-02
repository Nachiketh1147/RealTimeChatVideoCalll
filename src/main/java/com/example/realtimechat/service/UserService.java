package com.example.realtimechat.service;

import com.example.realtimechat.model.UserStatus;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserService {
    private final Map<String, UserStatus> users = new ConcurrentHashMap<>();

    public void setOnline(String username, boolean online) {
        users.put(username, new UserStatus(username, online));
    }

    public List<UserStatus> all() {
        return users.values().stream().collect(Collectors.toList());
    }

    public UserStatus get(String username) {
        return users.get(username);
    }
}
