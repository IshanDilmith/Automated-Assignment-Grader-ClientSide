import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NotFoundPage() {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardContent className="grid gap-4 p-8 text-center">
          <div>
            <div className="text-5xl font-semibold">404</div>
            <p className="mt-2 text-sm text-muted-foreground">The page you asked for is not here.</p>
          </div>
          <Link className={cn(buttonVariants(), "mx-auto w-fit")} to="/">
            Return to dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
