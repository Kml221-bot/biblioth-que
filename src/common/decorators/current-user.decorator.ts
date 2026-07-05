import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: string;
  [key: string]: unknown;
};

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    return data && user ? user[data] : user;
  }
);
