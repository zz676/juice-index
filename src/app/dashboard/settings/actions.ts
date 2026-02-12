"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateProfile(prevState: any, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { message: "Unauthorized", type: "error" };
    }

    const name = formData.get("name") as string;

    if (!name || name.length < 2) {
        return { message: "Name must be at least 2 characters", type: "error" };
    }

    try {
        await prisma.user.update({
            where: { id: user.id },
            data: { name },
        });

        // Update Supabase user metadata as well to keep in sync
        await supabase.auth.updateUser({
            data: { full_name: name },
        });

        revalidatePath("/dashboard/settings");
        return { message: "Profile updated successfully!", type: "success" };
    } catch (error) {
        return { message: "Failed to update profile", type: "error" };
    }
}
