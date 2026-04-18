FROM public.ecr.aws/lambda/nodejs:22 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# ---

FROM public.ecr.aws/lambda/nodejs:22 AS runner

WORKDIR ${LAMBDA_TASK_ROOT}

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

CMD ["dist/lambdas/inputReview.handler"]