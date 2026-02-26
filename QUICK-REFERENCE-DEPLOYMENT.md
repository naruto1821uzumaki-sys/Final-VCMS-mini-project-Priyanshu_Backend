# QUICK REFERENCE: PRODUCTION DEPLOYMENT GUIDE

Essential commands and procedures for deploying VCMS to production.

## 1. PRE-DEPLOYMENT CHECKLIST (72 Hours)

```bash
#!/bin/bash
# Run these checks 72 hours before launch

echo "=== 72-HOUR PRE-DEPLOYMENT CHECKLIST ==="

# 1. Code review
echo "✓ Verify all code reviewed and approved"
git log --oneline main | head -5

# 2. Test suite
echo "✓ Running full test suite..."
npm run test:all --verbose
echo "Result: $?"

# 3. Security audit
echo "✓ Running security audit..."
npm audit --audit-level=moderate
npm run test:security -- --coverage

# 4. Performance
echo "✓ Validating performance..."
npm run test:performance

# 5. Staging environment
echo "✓ Checking staging..."
curl -f https://api-staging.yourdomain.com/health

# 6. Build image
echo "✓ Building Docker image..."
docker build -t vcms-backend:v1.0.0 .

echo ""
echo "✅ All pre-deployment checks passed!"
```

## 2. ENVIRONMENT SETUP (24 Hours)

```bash
#!/bin/bash
# Setup production environment

# Create namespaces
kubectl create namespace vcms
kubectl create namespace vcms-monitoring

# Create secrets
kubectl create secret generic vcms-secrets \
  --from-literal=JWT_SECRET=$(openssl rand -hex 32) \
  --from-literal=MONGODB_URI="mongodb+srv://..." \
  -n vcms

# Create configmap
kubectl create configmap vcms-config \
  --from-literal=NODE_ENV=production \
  --from-literal=LOG_LEVEL=info \
  -n vcms

# Verify
kubectl get secrets -n vcms
kubectl get configmaps -n vcms
```

## 3. DATABASE PREPARATION

```bash
#!/bin/bash
# Prepare database

# Run migrations
node server/scripts/migrate.js status
node server/scripts/migrate.js migrate

# Verify database
node server/scripts/mongodb-atlas-setup.js verify

# Create indexes
node << 'EOF'
const mongoose = require('mongoose');
const { createProductionIndexes } = require('./server/scripts/mongodb-atlas-setup');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => createProductionIndexes())
  .then(() => process.exit(0));
EOF
```

## 4. DEPLOYMENT EXECUTION (Launch Day)

```bash
#!/bin/bash
# Deploy to production

set -e

echo "🚀 DEPLOYING VCMS v1.0.0"

# Step 1: Pre-flight
echo "Step 1: Pre-flight checks..."
curl -f https://api-staging.yourdomain.com/health

# Step 2: Backup database
echo "Step 2: Database backup..."
# MongoDB Atlas auto-backup

# Step 3: Deploy secrets
echo "Step 3: Creating secrets..."
kubectl apply -f k8s/03-secrets.yaml

# Step 4: Deploy application
echo "Step 4: Deploying application..."
kubectl apply -f k8s/04-deployment.yaml
kubectl apply -f k8s/05-service.yaml
kubectl apply -f k8s/06-ingress.yaml

# Step 5: Wait for rollout
echo "Step 5: Waiting for rollout..."
kubectl rollout status deployment/vcms-backend -n vcms --timeout=5m

# Step 6: Verify
echo "Step 6: Verification..."
HEALTH=$(curl -s https://api.yourdomain.com/health | jq -r .status)
READY=$(curl -s https://api.yourdomain.com/ready | jq -r .ready)

if [ "$HEALTH" = "alive" ] && [ "$READY" = "true" ]; then
  echo "✅ Deployment successful!"
else
  echo "❌ Deployment failed"
  kubectl rollout undo deployment/vcms-backend -n vcms
  exit 1
fi

# Step 7: Enable autoscaling
echo "Step 7: Enabling autoscaling..."
kubectl apply -f k8s/07-hpa.yaml

# Step 8: Notify team
echo "Step 8: Sending notifications..."
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK \
  -d '{"text":"🚀 VCMS v1.0.0 deployed to production"}'

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
```

## 5. POST-DEPLOYMENT VERIFICATION

```bash
#!/bin/bash
# Verify deployment

echo "=== POST-DEPLOYMENT VERIFICATION ==="

# 1. Health checks
echo "✓ Health check..."
curl -s https://api.yourdomain.com/health | jq .

echo "✓ Readiness check..."
curl -s https://api.yourdomain.com/ready | jq .

# 2. Pod status
echo "✓ Pod status..."
kubectl get pods -n vcms

# 3. Metrics
echo "✓ Metrics..."
curl -s https://api.yourdomain.com/metrics | head -10

# 4. Error rate
echo "✓ Error rate..."
curl -s https://prometheus.yourdomain.com/api/v1/query?query='rate(http_requests_total{status=~"5.."}[5m])' | jq .

# 5. Latency
echo "✓ P95 Latency..."
curl -s https://prometheus.yourdomain.com/api/v1/query?query='histogram_quantile(0.95, http_request_duration_seconds)' | jq .

echo ""
echo "✅ All verification checks passed!"
```

## 6. MONITORING & ALERTING

```bash
#!/bin/bash
# Verify monitoring

echo "=== MONITORING & ALERTING SETUP ==="

# Deploy monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Verify services
echo "Prometheus:"
curl -s http://localhost:9090/-/healthy

echo "Grafana:"
curl -s http://localhost:3000/api/health

echo "Alertmanager:"
curl -s http://localhost:9093/-/healthy

# Check if alerts are firing
curl -s http://localhost:9093/api/v1/alerts | jq .

echo ""
echo "✅ Monitoring activated!"
```

## 7. QUICK ROLLBACK

```bash
#!/bin/bash
# Emergency rollback

echo "⚠️  INITIATING EMERGENCY ROLLBACK"

# Rollback deployment
kubectl rollout undo deployment/vcms-backend -n vcms

# Wait for rollback
kubectl rollout status deployment/vcms-backend -n vcms --timeout=3m

# Verify
HEALTH=$(curl -s https://api.yourdomain.com/health | jq -r .status)

if [ "$HEALTH" = "alive" ]; then
  echo "✅ Rollback successful"
  
  # Notify team
  curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK \
    -d '{"text":"⚠️ VCMS rolled back to previous version"}'
else
  echo "❌ Rollback failed - manual intervention required"
  exit 1
fi
```

## 8. COMMON OPERATIONS

### Scale Application
```bash
# Scale up
kubectl scale deployment vcms-backend --replicas=5 -n vcms

# Watch scaling
kubectl get pods -n vcms -w
```

### View Logs
```bash
# Real-time logs
kubectl logs -f deployment/vcms-backend -n vcms

# Last 100 lines
kubectl logs --tail=100 deployment/vcms-backend -n vcms

# Specific pod
kubectl logs <pod-name> -n vcms
```

### Execute Commands in Pod
```bash
# Interactive shell
kubectl exec -it <pod-name> -n vcms -- /bin/sh

# Run single command
kubectl exec <pod-name> -n vcms -- node -v
```

### Update Application
```bash
# Update image
kubectl set image deployment/vcms-backend \
  vcms-backend=registry.example.com/vcms-backend:v1.1.0 \
  -n vcms

# Watch rollout
kubectl rollout status deployment/vcms-backend -n vcms
```

### Check Resource Usage
```bash
# Current usage
kubectl top pods -n vcms

# Watch usage
kubectl top pods -n vcms --watch
```

## 9. TROUBLESHOOTING QUICK COMMANDS

```bash
# Pod not starting
kubectl describe pod <pod-name> -n vcms

# Check logs for errors
kubectl logs <pod-name> -n vcms | grep -i error

# Check events
kubectl get events -n vcms --sort-by='.lastTimestamp'

# DNS test
kubectl exec <pod-name> -n vcms -- nslookup kubernetes.default

# Database connection test
kubectl exec <pod-name> -n vcms -- mongosh $MONGODB_URI

# Redis test
kubectl exec <pod-name> -n vcms -- redis-cli -u $REDIS_URL ping
```

## 10. DEPLOYMENT TIMELINE

| Time | Action | Command |
|------|--------|---------|
| **T-72h** | Pre-deployment checks | `npm run test:all` |
| **T-24h** | Environment setup | `kubectl create namespace vcms` |
| **T-6h** | Database prep | `node server/scripts/migrate.js migrate` |
| **T-1h** | Final verification | `npm run test:security` |
| **T+0** | Deploy application | `kubectl apply -f k8s/04-deployment.yaml` |
| **T+5m** | Verify deployment | `curl https://api.yourdomain.com/health` |
| **T+15m** | Enable monitoring | `kubectl apply -f k8s/monitoring` |
| **T+30m** | Team notification | Slack message |
| **T+1h** | Stability check | Monitor error rate & latency |

## 11. EMERGENCY CONTACTS

| Role | Name | Phone | Slack |
|------|------|-------|-------|
| On-Call Engineer | NAME | +1-XXX-XXX-XXXX | @oncall |
| DevOps Lead | NAME | +1-XXX-XXX-XXXX | @devops |
| Engineering Manager | NAME | +1-XXX-XXX-XXXX | @manager |
| PagerDuty | - | - | #incidents |

## 12. SUCCESS CRITERIA

✅ Health endpoint responding  
✅ Ready endpoint returning true  
✅ Error rate < 0.1%  
✅ P95 latency < 500ms  
✅ CPU < 70%  
✅ Memory < 80%  
✅ All pods running (1+ healthy replicas)  
✅ No critical errors in logs  
✅ Monitoring alerts active  
✅ Team notified  

## 13. FAILURE RECOVERY

| Issue | Check | Solution |
|-------|-------|----------|
| Pod won't start | `kubectl describe pod` | Check logs, increase resources |
| Database timeout | `mongosh $URI` | Verify connectivity, check firewall |
| High error rate | `kubectl logs` | Check for bugs, rollback if needed |
| Memory leak | `kubectl top pods` | Restart pods, check code |
| Slow endpoints | `curl -i` | Check database, add indexes |

---

**Keep this guide handy during deployment. Questions? Check PHASE-11GH-DOCUMENTATION-LAUNCH.md for details.**

**Status: READY FOR DEPLOYMENT 🚀**
