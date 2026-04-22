# PL-6 Test Suite

## Template System & Multi-Template Support Tests

This test suite validates the PL-6 implementation for multi-template support, including:
- Template database management
- Multi-template chat service
- Intent recognition
- Template prompt files
- Configuration validation

## Running Tests

### Python Backend Tests
```bash
cd backend
python -m pytest tests/test_pl6_templates.py -v
```

### Frontend Tests
```bash
cd frontend
npm test -- src/utils/templateEngine.test.ts
```

## Test Categories

### 1. TemplateDatabaseRegistry Tests
- Database initialization
- Create/Read/Update/Delete operations
- Search functionality
- Similar template recommendations

### 2. MultiTemplateChatService Tests
- Template configuration existence
- System prompt loading
- Missing field validation per template type

### 3. IntentRecognition Tests
- Fallback recognition behavior
- Known template detection

### 4. Configuration Tests
- templates.json validity
- Prompt file existence

## Expected Results

All tests should pass:
- ✅ Database operations work correctly
- ✅ Multi-template support is functional
- ✅ Intent recognition returns valid recommendations
- ✅ All configuration files are valid
