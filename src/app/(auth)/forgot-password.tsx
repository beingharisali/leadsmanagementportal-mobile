import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { TextField } from "@/components/ui/text-field";
import { authApi } from "@/features/auth/api";
import { fieldError, getErrorMessage } from "@/lib/api-client";
import { spacing } from "@/theme/colors";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const reset = useMutation({ mutationFn: () => authApi.forgotPassword({ email: email.trim() }) });

  if (reset.isSuccess) {
    return (
      <Screen edges={["left", "right", "bottom"]}>
        <Banner
          tone="success"
          title="Check your email"
          message={`If ${email.trim()} has an account, we've sent a link to choose a new password. Open it on this phone or a computer, then come back and sign in.`}
        />
        <Button title="Back to sign in" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const emailError = fieldError(reset.error, "email");
  return (
    <Screen edges={["left", "right", "bottom"]}>
      <AppText muted>Enter the email you sign in with and we'll send you a link to choose a new password.</AppText>
      {reset.error && !emailError && <Banner tone="danger" message={getErrorMessage(reset.error)} />}
      <View style={styles.form}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          returnKeyType="send"
          onSubmitEditing={() => reset.mutate()}
          error={emailError}
        />
        <Button title="Send reset link" onPress={() => reset.mutate()} loading={reset.isPending} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
});
