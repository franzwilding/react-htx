#!/usr/bin/env node
import { runCli } from "./runCli";

process.exit(runCli(process.argv.slice(2)));
