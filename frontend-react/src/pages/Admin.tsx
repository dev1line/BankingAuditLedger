import React, { useState } from "react";
import { Send, CheckCircle } from "lucide-react";
import { logService, CreateLogRequest } from "../services/api";

const Admin: React.FC = () => {
  const [formData, setFormData] = useState<CreateLogRequest>({
    source: "core-banking",
    event_type: "transfer",
    payload: {
      from: "account-001",
      to: "account-002",
      amount: 1000,
      currency: "USD",
      description: "Test transfer",
    },
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await logService.createLog(formData);
      setSuccess(`Log created successfully! ID: ${response.id}`);

      // Reset form
      setFormData({
        source: "core-banking",
        event_type: "transfer",
        payload: {
          from: "account-001",
          to: "account-002",
          amount: Math.floor(Math.random() * 10000) + 100,
          currency: "USD",
          description: "Test transfer",
        },
      });
    } catch (err) {
      setError("Failed to create log");
      console.error("Error creating log:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (field === "payload") {
      setFormData((prev) => ({ ...prev, payload: value }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const updatePayloadField = (key: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      payload: { ...prev.payload, [key]: value },
    }));
  };

  const generateRandomPayload = () => {
    const sources = ["core-banking", "auth-service", "payment-gateway"];
    const eventTypes = ["transfer", "config_change", "login", "transaction"];
    const currencies = ["USD", "EUR", "GBP"];

    const randomSource = sources[Math.floor(Math.random() * sources.length)];
    const randomEventType =
      eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const randomCurrency =
      currencies[Math.floor(Math.random() * currencies.length)];

    setFormData({
      source: randomSource,
      event_type: randomEventType,
      payload: {
        from: `account-${Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, "0")}`,
        to: `account-${Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, "0")}`,
        amount: Math.floor(Math.random() * 10000) + 100,
        currency: randomCurrency,
        description: `Test ${randomEventType}`,
        timestamp: new Date().toISOString(),
        user_id: `user-${Math.floor(Math.random() * 100)}`,
        session_id: `session-${Math.random().toString(36).substr(2, 9)}`,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-600">Create synthetic audit logs for testing</p>
      </div>

      {/* Success message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Create Test Log</h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source
              </label>
              <select
                value={formData.source}
                onChange={(e) => handleInputChange("source", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required>
                <option value="core-banking">Core Banking</option>
                <option value="auth-service">Auth Service</option>
                <option value="payment-gateway">Payment Gateway</option>
                <option value="compliance-service">Compliance Service</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Type
              </label>
              <select
                value={formData.event_type}
                onChange={(e) =>
                  handleInputChange("event_type", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required>
                <option value="transfer">Transfer</option>
                <option value="config_change">Config Change</option>
                <option value="login">Login</option>
                <option value="transaction">Transaction</option>
                <option value="withdrawal">Withdrawal</option>
                <option value="deposit">Deposit</option>
              </select>
            </div>
          </div>

          {/* Payload Fields */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Payload Data
              </label>
              <button
                type="button"
                onClick={generateRandomPayload}
                className="text-sm text-primary-600 hover:text-primary-700">
                Generate Random Data
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Account
                </label>
                <input
                  type="text"
                  value={formData.payload.from || ""}
                  onChange={(e) => updatePayloadField("from", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="account-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Account
                </label>
                <input
                  type="text"
                  value={formData.payload.to || ""}
                  onChange={(e) => updatePayloadField("to", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="account-002"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  value={formData.payload.amount || ""}
                  onChange={(e) =>
                    updatePayloadField(
                      "amount",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <select
                  value={formData.payload.currency || "USD"}
                  onChange={(e) =>
                    updatePayloadField("currency", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.payload.description || ""}
                  onChange={(e) =>
                    updatePayloadField("description", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Test transfer"
                />
              </div>
            </div>
          </div>

          {/* JSON Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payload Preview
            </label>
            <pre className="text-sm text-gray-900 bg-gray-50 p-4 rounded-lg overflow-x-auto border">
              {JSON.stringify(formData.payload, null, 2)}
            </pre>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Create Log
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Admin;
