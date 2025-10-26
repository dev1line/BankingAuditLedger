import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Copy,
  RefreshCw,
} from "lucide-react";
import { logService, LogResponse, VerificationResponse } from "../services/api";

const LogDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [log, setLog] = useState<LogResponse | null>(null);
  const [verification, setVerification] = useState<VerificationResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLog = useCallback(async () => {
    try {
      setLoading(true);
      const response = await logService.getLog(id!);
      setLog(response);
      setError(null);
    } catch (err) {
      setError("Failed to fetch log details");
      console.error("Error fetching log:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchLog();
    }
  }, [id, fetchLog]);

  const verifyLog = async () => {
    if (!id) return;

    try {
      setVerifying(true);
      const response = await logService.verifyLog(id);
      setVerification(response);
    } catch (err) {
      console.error("Error verifying log:", err);
    } finally {
      setVerifying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (log: LogResponse) => {
    if (log.committed_at) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Committed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <Clock className="h-3 w-3 mr-1" />
        Pending
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !log) {
    return (
      <div className="text-center py-12">
        <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
        <p className="text-gray-500">{error || "Log not found"}</p>
        <Link
          to="/"
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="mr-4 p-2 text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Log Details</h1>
            <p className="text-gray-600">Log ID: {log.id}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {getStatusBadge(log)}
          <button
            onClick={verifyLog}
            disabled={verifying}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50">
            <RefreshCw
              className={`h-4 w-4 mr-2 ${verifying ? "animate-spin" : ""}`}
            />
            {verifying ? "Verifying..." : "Verify"}
          </button>
        </div>
      </div>

      {/* Verification Result */}
      {verification && (
        <div
          className={`p-4 rounded-lg border ${
            verification.is_valid
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}>
          <div className="flex items-center">
            {verification.is_valid ? (
              <CheckCircle className="h-5 w-5 text-green-400" />
            ) : (
              <XCircle className="h-5 w-5 text-red-400" />
            )}
            <div className="ml-3">
              <h3
                className={`text-sm font-medium ${
                  verification.is_valid ? "text-green-800" : "text-red-800"
                }`}>
                Verification {verification.is_valid ? "Successful" : "Failed"}
              </h3>
              <p
                className={`text-sm ${
                  verification.is_valid ? "text-green-700" : "text-red-700"
                }`}>
                Verified at {formatDate(verification.verified_at)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Log Information */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Log Information
            </h2>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Source
              </label>
              <p className="mt-1 text-sm text-gray-900">{log.source}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Event Type
              </label>
              <p className="mt-1 text-sm text-gray-900">{log.event_type}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Created At
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {formatDate(log.created_at)}
              </p>
            </div>
            {log.committed_at && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Committed At
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {formatDate(log.committed_at)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Blockchain Information */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-primary-600" />
              Blockchain Information
            </h2>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Hash
              </label>
              <div className="mt-1 flex items-center">
                <code className="text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded flex-1">
                  {log.hash}
                </code>
                <button
                  onClick={() => copyToClipboard(log.hash)}
                  className="ml-2 p-1 text-gray-400 hover:text-gray-600">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
            {log.tx_id && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Transaction ID
                </label>
                <div className="mt-1 flex items-center">
                  <code className="text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded flex-1">
                    {log.tx_id}
                  </code>
                  <button
                    onClick={() => copyToClipboard(log.tx_id!)}
                    className="ml-2 p-1 text-gray-400 hover:text-gray-600">
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
            {verification && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Off-chain Hash
                  </label>
                  <code className="text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded block">
                    {verification.hash_offchain}
                  </code>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    On-chain Hash
                  </label>
                  <code className="text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded block">
                    {verification.hash_onchain}
                  </code>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Payload */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Payload</h2>
        </div>
        <div className="px-6 py-4">
          <pre className="text-sm text-gray-900 bg-gray-50 p-4 rounded-lg overflow-x-auto">
            {JSON.stringify(log.payload, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default LogDetail;
