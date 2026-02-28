import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";

export default function LoginCard() {
  return (
    <Card className="w-full max-w-sm mx-auto shadow-[0px_4px_10px_rgba(74,85,104,0.3)]">
      <CardHeader>
        <img src="/logo.png" alt="Logo" className="w-16 h-16 mx-auto mb-4" />
        <CardTitle className="font-lexend text-center text-2xl font-bold">
          Login
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Label className="font-inter block mb-4" htmlFor="username">
          Username
        </Label>
        <Input
          id="username"
          type="text"
          placeholder="Username"
          className="font-inter mb-4"
        />
        <Label className="font-inter block mb-4" htmlFor="password">
          Password
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="Password"
          className="font-inter mb-4"
        />
      </CardContent>
      <CardFooter>
        <Button className="w-full font-inter">Login</Button>
      </CardFooter>
    </Card>
  );
}
