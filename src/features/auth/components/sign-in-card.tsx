"use client";

import { DottedSeparator } from "@/components/dotted-separator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import Link from "next/link";
import { loginSchema } from "../schemas";
import { useLogin } from "../api/use-login";
import { signUpWithGithub, signUpWithGoogle } from "@/lib/oauth";
import { LoaderCircle, LockKeyhole } from "lucide-react";

export const SignInCard = () => {
  const { mutate, isPending } = useLogin();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    mutate({ json: values });
  };

  return (
    <Card className="glass-panel-strong w-full max-w-[520px] overflow-hidden rounded-[2rem] border-white/15">
      <CardHeader className="flex items-center justify-center p-8 text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
          <LockKeyhole className="size-6 text-neutral-200" />
        </div>
        <CardTitle className="text-3xl font-bold text-white">
          Welcome back
        </CardTitle>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Continue into your workspace command center.
        </p>
      </CardHeader>
      <div className="px-7">
        <DottedSeparator />
      </div>

      <CardContent className="p-7">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              name="email"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="Enter Email Address"
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="password"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder="Enter Password"
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <Button disabled={isPending} size={"lg"} className="w-full">
              {isPending && <LoaderCircle className="animate-spin" />}
              Sign in
            </Button>
          </form>
        </Form>
      </CardContent>

      <div className="px-7">
        <DottedSeparator />
      </div>

      <CardContent className="p-7 flex flex-col gap-y-4">
        <Button
          onClick={() => signUpWithGoogle()}
          disabled={isPending}
          variant={"secondary"}
          size={"lg"}
          className="w-full"
        >
          <FcGoogle className="mr-2 size-5" />
          Login with Google
        </Button>

        <Button
          onClick={() => signUpWithGithub()}
          disabled={isPending}
          variant={"secondary"}
          size={"lg"}
          className="w-full"
        >
          <FaGithub className="mr-2 size-5" />
          Login with Github
        </Button>
      </CardContent>
      <div className="px-7">
        <DottedSeparator />
      </div>

      <CardContent className="p-7 flex items-center justify-center">
        <p className="text-sm text-neutral-400">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up">
            <span className="text-white underline underline-offset-4">
              Sign Up
            </span>
          </Link>
        </p>
      </CardContent>
    </Card>
  );
};
