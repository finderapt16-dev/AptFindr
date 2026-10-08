export const getRoomStatus = (room) =>
    room.status ?? (room.isOccupied ? "occupied" : "available");

// Preserve the original order within each availability group.
export const sortRoomsByAvailability = (rooms = []) =>
    [...rooms].sort((first, second) =>
        Number(getRoomStatus(second) === "available") -
        Number(getRoomStatus(first) === "available"),
    );
