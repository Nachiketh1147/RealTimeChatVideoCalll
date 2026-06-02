package com.example.realtimechat.controller;

import com.example.realtimechat.model.SignalMessage;
import com.example.realtimechat.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class SignalingController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private UserService userService;

    // signaling messages (offer/answer/ice)
    @MessageMapping("/signaling")
    public void signaling(SignalMessage msg) {
        // forward to target user if provided
        if (msg.getTo() != null && !msg.getTo().isEmpty()) {
            messagingTemplate.convertAndSendToUser(msg.getTo(), "/queue/signaling", msg);
        } else if (msg.getRoomId() != null) {
            messagingTemplate.convertAndSend("/topic/room." + msg.getRoomId() + ".signal", msg);
        }
    }
}
