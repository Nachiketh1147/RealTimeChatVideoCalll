package com.example.realtimechat.controller;

import com.example.realtimechat.model.ChatMessage;
import com.example.realtimechat.model.UserStatus;
import com.example.realtimechat.service.MessageService;
import com.example.realtimechat.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class ChatController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private MessageService messageService;

    @Autowired
    private UserService userService;

    // Handle chat message publishing
    @MessageMapping("/chat.send")
    public void sendMessage(@Payload ChatMessage chatMessage) {
        // persist
        messageService.saveMessage(chatMessage);
        // publish to room topic
        messagingTemplate.convertAndSend("/topic/room." + chatMessage.getRoomId(), chatMessage);

        // if toUser present, also send to user queue
        if (chatMessage.getToUser() != null && !chatMessage.getToUser().isEmpty()) {
            messagingTemplate.convertAndSendToUser(chatMessage.getToUser(), "/queue/messages", chatMessage);
        }
    }

    // search messages
    @GetMapping("/api/search")
    public List<ChatMessage> search(@RequestParam String roomId, @RequestParam String q) {
        return messageService.search(roomId, q);
    }

    @GetMapping("/api/users")
    public List<UserStatus> users() {
        return userService.all();
    }
}
