export async function saveAdminAvatar(client, userId, file, timeoutMs = 30000) {
    if (!userId) throw new Error("Sign in before uploading a profile photo.");
    const extensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
    const extension = extensions[file.type];
    if (!extension) throw new Error("Choose a JPG, PNG, or WebP image.");
    if (file.size > 2 * 1024 * 1024) throw new Error("Profile photo must be 2MB or smaller.");
    const controller = new AbortController();
    let stage = "uploading your photo";
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
            controller.abort();
            reject(new Error(`Timed out while ${stage}. Check your connection and try again. If it continues, sign out and sign back in.`));
        }, timeoutMs);
    });
    try {
        return await Promise.race([timeout, (async () => {
            const bucket = client.storage.from("user-avatars");
            const path = `${userId}/${crypto.randomUUID()}.${extension}`;
            const { error: uploadError } = await bucket.upload(path, file, {
                cacheControl: "3600", upsert: false, contentType: file.type,
            });
            // An upload may finish after the timeout; never save that late result.
            controller.signal.throwIfAborted();
            if (uploadError) throw new Error(uploadError.message || "Unable to upload your photo.");
            const avatar = bucket.getPublicUrl(path).data.publicUrl;
            stage = "saving your profile photo";
            const { data, error } = await client.from("app_users")
                .update({ avatar_url: avatar }).eq("id", userId)
                .select("id, avatar_url").single().abortSignal(controller.signal);
            if (error || !data) throw new Error(error?.message || "Unable to save your profile photo.");
            return avatar;
        })()]);
    } finally {
        clearTimeout(timer);
    }
}
