import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main>
      <div className="container" style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
        <SignUp routing="path" path="/sign-up" />
      </div>
    </main>
  );
}
