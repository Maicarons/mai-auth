import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main>
      <div className="container" style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
        <SignIn routing="path" path="/sign-in" />
      </div>
    </main>
  );
}
