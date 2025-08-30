# 🔑 DETAILED WALKTHROUGH: Step 3 - Enable Required APIs

## CRITICAL: These APIs must be enabled for CoralCrave to work!

Without these APIs, you'll get 400 Bad Request errors when trying to create streams.

---

## 🎯 STEP-BY-STEP INSTRUCTIONS

### Step 1: Access Google Cloud Console
1. **Open this exact link**: https://console.cloud.google.com/apis/dashboard?project=coralcrave
2. **Make sure you're in the right project**: You should see "coralcrave" in the project selector at the top
3. **If wrong project**: Click the project dropdown and select "coralcrave"

### Step 2: Navigate to API Library
1. **Look for the blue button**: "+ ENABLE APIS AND SERVICES" (top of the page)
2. **Click it**: This opens the API Library
3. **You should see**: A search box and grid of available APIs

---

## 🔍 ENABLE EACH API (Do this 4 times)

### API #1: Cloud Firestore API
1. **In the search box**, type: `Cloud Firestore API`
2. **Click on**: "Cloud Firestore API" (should be first result)
3. **Click**: "ENABLE" button (blue button)
4. **Wait**: 10-30 seconds for "API enabled" confirmation
5. **Success indicator**: You'll see "API enabled" with a green checkmark

### API #2: Firebase Authentication API
1. **Go back to API Library**: Click "API Library" in breadcrumb or use back button
2. **Search for**: `Firebase Authentication API`
3. **Click on**: "Firebase Authentication API"
4. **Click**: "ENABLE" button
5. **Wait**: For confirmation message

### API #3: Firebase Hosting API
1. **Go back to API Library**
2. **Search for**: `Firebase Hosting API`
3. **Click on**: "Firebase Hosting API"
4. **Click**: "ENABLE" button
5. **Wait**: For confirmation

### API #4: Firebase Storage API
1. **Go back to API Library**
2. **Search for**: `Firebase Storage API`
3. **Click on**: "Firebase Storage API"
4. **Click**: "ENABLE" button
5. **Wait**: For confirmation

---

## ✅ VERIFICATION: Check All APIs Are Enabled

### Method 1: Check Enabled APIs List
1. **Go to**: https://console.cloud.google.com/apis/dashboard?project=coralcrave
2. **Look at the list**: You should see all 4 APIs listed as "Enabled"
3. **Expected entries**:
   - Cloud Firestore API ✅
   - Firebase Authentication API ✅
   - Firebase Hosting API ✅
   - Firebase Storage API ✅

### Method 2: Search Each API Again
1. **Go back to API Library**
2. **Search for each API name**
3. **Instead of "ENABLE"**: You should now see "MANAGE" button
4. **This confirms**: The API is already enabled

---

## 🚨 TROUBLESHOOTING

### If you can't find an API:
- **Double-check spelling**: Copy/paste the exact names above
- **Try variations**: Sometimes APIs have slightly different names
- **Look for similar names**: Firebase APIs might be grouped together

### If "ENABLE" button is grayed out:
- **Check permissions**: You need to be project owner/editor
- **Check billing**: Some APIs require Blaze plan (step 2 in main guide)
- **Wait and retry**: Sometimes there's a delay

### If you get permission errors:
- **Make sure you're signed in**: With the Google account that owns the project
- **Check project selection**: Verify "coralcrave" is selected at the top
- **Contact project owner**: If you're not the owner, ask them to do this step

---

## ⏱️ IMPORTANT TIMING NOTES

### After Enabling APIs:
- **Wait 5-10 minutes**: APIs need time to propagate
- **Don't test immediately**: Give Google's systems time to update
- **Be patient**: This is the most common cause of continued 400 errors

### Expected Timeline:
- **Enabling each API**: 10-30 seconds
- **All 4 APIs**: 2-5 minutes total
- **Full propagation**: 5-10 minutes after completion

---

## 🎯 WHAT HAPPENS NEXT

### After completing this step:
1. **Continue with step 4**: Set up Firestore security rules
2. **Complete all 9 steps**: Don't skip any steps
3. **Test your streams**: After completing the full setup
4. **Expect success**: 400 errors should be completely resolved

### Success indicators:
- All 4 APIs show "MANAGE" instead of "ENABLE"
- No permission errors when testing
- Firestore connections work properly
- Stream creation succeeds

---

## 🔄 QUICK REFERENCE

**APIs to enable (copy these names exactly):**
1. `Cloud Firestore API`
2. `Firebase Authentication API`
3. `Firebase Hosting API`
4. `Firebase Storage API`

**Direct link to API Library:**
https://console.cloud.google.com/apis/library?project=coralcrave

**This step is CRITICAL - without these APIs, your streams cannot save to the database!**
