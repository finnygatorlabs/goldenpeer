#!/bin/bash
pnpm --filter @workspace/api-server run dev &
pnpm --filter @workspace/senior-shield run dev &
wait
