import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  canActivate(context: ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: { authorization?: string } }>();

    if (!request.headers.authorization) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(error: unknown, user: TUser) {
    if (error || !user) {
      return null;
    }

    return user;
  }
}
