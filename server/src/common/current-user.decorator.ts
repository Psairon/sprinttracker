import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from './auth.guard';

/** Injects the authenticated user's id (from the JWT) into a controller handler. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return (request.user as JwtPayload).sub;
  },
);
