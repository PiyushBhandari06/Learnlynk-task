// LearnLynk Tech Test - Task 3: Edge Function create-task

// Deno + Supabase Edge Functions style
// Docs reference: https://supabase.com/docs/guides/functions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type CreateTaskPayload = {
  application_id: string;
  task_type: string;
  due_at: string;
};

const VALID_TYPES = ["call", "email", "review"];

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as Partial<CreateTaskPayload>;
    const { application_id, task_type, due_at } = body;

    // TODO ✔️: validate application_id, task_type, due_at
    if (!application_id || !task_type || !due_at) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // - check task_type in VALID_TYPES
    if (!VALID_TYPES.includes(task_type)) {
      return new Response(
        JSON.stringify({ error: "Invalid task_type" }),

        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    // - parse due_at and ensure it's in the future

    const dueDate = new Date(due_at);
    if (isNaN(dueDate.getTime()) || dueDate <= new Date()) {
      return new Response(
        JSON.stringify({ error: "due_at must be a valid future date" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // TODO ✔️: insert into tasks table using supabase client

    // Example:
    // const { data, error } = await supabase
    //   .from("tasks")
    //   .insert({ ... })
    //   .select()
    //   .single();

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        application_id,
        type: task_type,
        due_at,
        tenant_id: "00000000-0000-0000-0000-000000000000",
      })
      .select()
      .single();

    // TODO ✔️: handle error and return appropriate status code
    if (error) {
      console.error("Insert error:", error);
      return new Response(JSON.stringify({ error: "Database insert failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    await supabase.channel("task-events").send({
      type: "broadcast",
      event: "task.created",
      payload: { task_id: data.id },
    });

    // Example successful response:
    // return new Response(JSON.stringify({ success: true, task_id: data.id }), {
    //   status: 200,
    //   headers: { "Content-Type": "application/json" },
    // });
    return new Response(JSON.stringify({ success: true, task_id: data.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
