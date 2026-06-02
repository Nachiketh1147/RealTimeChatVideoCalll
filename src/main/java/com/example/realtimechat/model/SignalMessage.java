package com.example.realtimechat.model;

public class SignalMessage {
    private String type; // offer/answer/ice
    private String from;
    private String to;
    private String roomId;
    private Object data;

    // getters/setters
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getFrom() { return from; }
    public void setFrom(String from) { this.from = from; }
    public String getTo() { return to; }
    public void setTo(String to) { this.to = to; }
    public Object getData() { return data; }
    public void setData(Object data) { this.data = data; }
    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }
}
